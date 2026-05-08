# Research: ElectaBase Platform

**Branch**: `001-electabase-platform` | **Date**: 2026-05-08
**Purpose**: Resolve all technical decisions required before Phase 1 design

---

## 1. Web Scraping Library

**Decision**: Playwright (primary) + Cheerio (secondary for static HTML sources)

**Rationale**:
- Indian government portals (Lok Sabha, Rajya Sabha, ECI) use server-rendered HTML with some
  dynamic elements. Playwright handles both static and JS-rendered pages uniformly.
- PRS and ADR serve well-structured static HTML — Cheerio is faster for these.
- Playwright provides network interception (useful for detecting API calls government portals
  make internally), screenshot capability for audit trails, and stealth plugins to handle
  basic bot detection.
- Puppeteer was rejected: same capability as Playwright but Playwright has a better TypeScript
  API and built-in multi-browser support.

**Alternatives considered**:
- Puppeteer — same capability, inferior TS experience, rejected.
- Axios + Cheerio only — insufficient for JS-rendered pages, rejected.
- Scrapy (Python) — wrong language stack, rejected.

**Per-source strategy**:
| Source | URL | Approach | v1 Scope |
|--------|-----|----------|----------|
| ECI | eci.gov.in | Playwright — election results PDFs + structured HTML | Rajya Sabha (all states) + Lok Sabha Tamil Nadu |
| Lok Sabha | loksabha.nic.in | Playwright — member portal, attendance, questions DB | Tamil Nadu constituencies only (`scope.states: ["Tamil Nadu"]`) |
| Rajya Sabha | rajyasabha.nic.in | Playwright — member portal, attendance records | All states (`scope.states: null`) |
| PRS Legislative Research | prsindia.org | Cheerio — well-structured static HTML | All available members within scope |
| ADR | adrindia.org | Cheerio + PDF parsing — affidavits in PDF form | Affidavits for in-scope politicians only |

---

## 2. Job Scheduler

**Decision**: GitHub Actions cron (primary) + Next.js API route as the pipeline entrypoint

**Rationale**:
- GitHub Actions free tier provides 2,000 minutes/month — more than sufficient for one
  weekly scraping run.
- The scraping pipeline is exposed as a protected API route (`POST /api/admin/refresh`).
  The GitHub Action calls this route via a secure webhook token, keeping pipeline logic
  inside the Next.js app (no separate worker process needed at MVP).
- pg-boss was evaluated but adds infrastructure complexity (a persistent worker process)
  that is unnecessary when GitHub Actions provides free, reliable cron scheduling.
- Manual refresh from the admin panel calls the same API route directly.

**Alternatives considered**:
- pg-boss — PostgreSQL-backed job queue; better for high-frequency jobs, overkill for
  weekly runs, requires persistent worker. Rejected for MVP.
- Inngest — event-driven job platform with free tier; excellent DX but introduces a
  third-party dependency. Revisit at scale.
- Vercel Cron Jobs — available on Vercel Pro ($20/mo), not free tier. Rejected.

---

## 3. Authentication

**Decision**: Supabase Auth with magic-link (email OTP) for admin login

**Rationale**:
- Supabase Auth integrates natively with the Supabase PostgreSQL database, sharing the
  same project, connection pool, and Row Level Security (RLS) policies.
- Magic-link (email OTP) avoids storing password hashes entirely — lower attack surface.
- No self-registration flow: admin accounts are created by the system administrator
  directly via the Supabase dashboard or a one-time seed script.
- NextAuth.js was evaluated but adds an extra configuration layer when Supabase is
  already the database provider.

**Alternatives considered**:
- NextAuth.js — more adapters; adds complexity when Supabase already handles auth. Rejected.
- Custom JWT auth — reinventing the wheel; prohibited by constitution ("no custom auth
  from scratch"). Rejected.

---

## 4. Search

**Decision**: PostgreSQL full-text search (FTS) with `tsvector` + GIN index for v1

**Rationale**:
- The politician dataset for v1 is ~3,000–3,500 records (all Rajya Sabha across all states +
  Lok Sabha Tamil Nadu across all years). PostgreSQL FTS comfortably handles this at sub-100ms
  query times; headroom exists for future state expansion before a search engine upgrade is needed.
- A `tsvector` column computed from `full_name || ' ' || constituency || ' ' || party_name`
  with a GIN index delivers instant search results.
- Meilisearch (self-hosted) or Typesense are the upgrade path when the dataset exceeds
  100K records or when fuzzy/typo-tolerant search is needed.

**Alternatives considered**:
- Meilisearch — excellent for typo tolerance; requires separate self-hosted instance at
  MVP. Deferred to v2 if needed.
- Elasticsearch — heavyweight, no meaningful free tier. Rejected.
- Algolia — paid SaaS. Rejected.

---

## 5. Transactional Email

**Decision**: Resend

**Rationale**:
- Free tier: 3,000 emails/month, 100/day — sufficient for admin refresh notifications
  and correction approval confirmations at MVP scale.
- First-class TypeScript SDK; integrates cleanly with Next.js server actions and API routes.
- React Email for template authoring (same ecosystem).

**Alternatives considered**:
- Postmark — reliable but 100 emails/month free tier (too restrictive). Rejected for MVP.
- SendGrid — 100 emails/day free but more complex setup. Rejected.
- Nodemailer + SMTP — requires managing an SMTP server. Rejected.

---

## 6. Object Storage

**Decision**: Supabase Storage (free tier: 1 GB)

**Rationale**:
- Colocated with the Supabase database — single platform for MVP.
- Sufficient for politician profile photos (estimated 3,000–3,500 photos × ~50KB average
  = ~175MB in v1; well within the 1 GB free tier).
- Integrated with Supabase Auth for access control.
- Cloudflare R2 (10 GB free) is the upgrade path if storage exceeds 1 GB.

**Alternatives considered**:
- Cloudflare R2 — more generous free tier but requires separate account/integration.
  Upgrade path, not MVP choice.
- AWS S3 — no meaningful free tier after 12 months. Rejected.

---

## 7. Ad Zone Management

**Decision**: Ad zone on/off config stored in a dedicated `AdZone` table in PostgreSQL,
fetched via a cached API call on layout render

**Rationale**:
- Five named zones (`header-banner`, `sidebar-top`, `sidebar-bottom`, `in-feed`,
  `profile-mid`) are configuration data — appropriate for the database.
- Next.js `unstable_cache` or `revalidateTag` ensures config is fetched at most once per
  deployment or on admin update — no performance impact.
- Vercel Edge Config was considered but adds a Vercel-specific dependency.

---

## 8. Scoring Algorithm — Exact Weights

### Effectiveness Score (0–100, higher = more effective)

All components are computed per politician per `country_code` to support multi-country
parameterization.

| Component | Max Points | Formula |
|-----------|-----------|---------|
| Attendance % | 20 | `attendance_pct × 0.20` (averaged across all tenures) |
| Questions raised | 15 | `min(1.0, ln(x+1) / ln(p75+1)) × 15` where p75 = 75th percentile nationally |
| Debates participated | 15 | `min(1.0, ln(x+1) / ln(p75+1)) × 15` |
| Private bills introduced | 20 | `min(1.0, ln(x+1) / ln(p75+1)) × 20` |
| Bills voted on (participation rate) | 10 | `participation_rate × 10` |
| Verified achievements | 15 | `sum(achievement_weight) × multiplier`, capped at 15 |
| Tenure duration factor | 5 | `min(1.0, total_tenure_years / 10) × 5` |

**Achievement category multipliers**:
LEGISLATION → 1.5 | WELFARE → 1.2 | INFRASTRUCTURE → 1.0 | INTERNATIONAL → 1.0 | AWARD → 0.5 | OTHER → 0.5

**Normalization**: Log-normalization (`ln(x+1)`) prevents gaming by raw quantity. A politician
who raises 1,000 low-quality questions does not score higher than one who raises 50 substantive
ones at the 75th percentile.

**Insufficient data handling**: If `attendance_records` is empty for a politician, the score
displays as "Insufficient Data" — not 0.

**Algorithm version**: `effectiveness-v1.0`

---

### Corruption Score (0–100, higher = more corrupt)

| Component | Max Points | Formula |
|-----------|-----------|---------|
| Criminal cases (by severity) | 30 | `sum(base_case_weight × severity_multiplier × status_modifier)`, capped at 30 |
| Conviction weight | 25 | `convicted_cases × 5`, capped at 25 |
| Jail time served | 15 | `min(1.0, total_jail_days / 3650) × 15` (3650 days = 10 years = max) |
| Verified corruption records | 15 | `min(15, corruption_record_count × 3)` |
| Electoral malpractice | 10 | `min(10, electoral_records × 5)` |
| Asset discrepancy | 5 | Binary: 0 or 5 if verified discrepancy sourced |

**IPC Severity Tiers** (maps `ipc_severity_tier` field):
| Tier | Description | Multiplier |
|------|-------------|-----------|
| 1 — SEVERE | Murder, rape, terrorism, dacoity, POCSO | 3.0 |
| 2 — SERIOUS | Corruption, fraud, money laundering, kidnapping, riot | 2.0 |
| 3 — MODERATE | Other non-bailable offences | 1.5 |
| 4 — MINOR | Bailable offences | 1.0 |

**Case status modifiers**:
| Status | Modifier |
|--------|---------|
| CONVICTED | 1.0 (full weight) |
| APPEALING | 0.5 |
| PENDING | 0.3 |
| ACQUITTED | −0.2 (reduces score; acquittal respected) |

**Zero-record rule**: A politician with no verified records scores exactly 0 — not "unknown."

**Algorithm version**: `corruption-v1.0`

---

## 9. Slug Generation Strategy

**Decision**: `{sanitized-full-name}-{birth-year}` with collision suffix `-{n}` for duplicates

**Rationale**:
- Example: "Narendra Modi" born 1950 → `narendra-modi-1950`
- Collision (two politicians with same name and birth year): `narendra-modi-1950-2`
- Slug is generated on first insert and never changed — stable URLs.
- If birth year is unknown: fall back to `{name}-{cuid-prefix}` (6 chars).

---

## 10. PDF Parsing for ADR Affidavits

**Decision**: `pdf-parse` library for extracting affidavit data from ADR's election
declaration PDFs

**Rationale**:
- ADR publishes candidate affidavits as PDFs. Key financial data (assets, liabilities,
  criminal cases) is semi-structured within these PDFs.
- `pdf-parse` extracts text; a regex/pattern layer then extracts structured fields.
- This is the standard approach for Indian election affidavit parsing (used by ADR's own
  MyNeta.info platform).

---

## 11. Rate Limiting

**Decision**: Upstash Redis rate limiting via `@upstash/ratelimit` for correction
submissions (5/hour per IP)

**Rationale**:
- Upstash provides a free Redis tier (10,000 commands/day) — sufficient for correction
  submission rate limiting at MVP.
- `@upstash/ratelimit` integrates with Next.js middleware cleanly.
- Vercel's built-in rate limiting (Vercel Firewall) requires Pro plan. Rejected.
- In-memory rate limiting (no Redis) fails across multiple Vercel instances. Rejected.

---

## 12. Scraping Scope Configuration Architecture

**Decision**: Scraping scope (house + states) stored in `DataSource.scraperConfig.scope`
as a JSON field. The pipeline orchestrator reads scope from the DB at runtime — no state
names are hardcoded in scraper source files.

**v1 DataSource seed records**:

| Source | `scraperConfig.scope` |
|--------|----------------------|
| ECI | `{ "house": null, "states": null }` — ECI covers all; pipeline filters by other sources' scope |
| Lok Sabha (loksabha.nic.in) | `{ "house": "LOK_SABHA", "states": ["Tamil Nadu"] }` |
| Rajya Sabha (rajyasabha.nic.in) | `{ "house": "RAJYA_SABHA", "states": null }` — null = all states |
| PRS (prsindia.org) | `{ "house": null, "states": null }` — PRS is cross-house; pipeline applies politician filter |
| ADR (adrindia.org) | `{ "house": null, "states": null }` — ADR covers all; pipeline filters to in-scope politicians |

**How the Lok Sabha scraper uses scope**:
```typescript
// src/lib/scrapers/lok-sabha.ts
const source = await db.dataSource.findUnique({ where: { id: LOK_SABHA_SOURCE_ID } });
const stateFilter: string[] | null = source.scraperConfig?.scope?.states ?? null;
// stateFilter = ["Tamil Nadu"] in v1
// stateFilter = null means scrape all states (future versions)
const constituencies = await fetchConstituencies({ states: stateFilter });
```

**Expanding to a new state (zero re-architecture)**:
To add Karnataka Lok Sabha in v2, an admin updates the `DataSource` record via the admin
panel or a one-line SQL update:
```sql
UPDATE data_sources
SET scraper_config = jsonb_set(
  scraper_config,
  '{scope,states}',
  '["Tamil Nadu", "Karnataka"]'
)
WHERE url LIKE '%loksabha%';
```
The next scraping run (scheduled or manually triggered) picks up the new scope automatically.
No code change, no redeployment, no schema migration.

**Admin panel display** (`/admin/sources`):
Each DataSource row displays a "Scope" badge:
- Rajya Sabha source → `Rajya Sabha · All States`
- Lok Sabha source → `Lok Sabha · Tamil Nadu` (in v1)
- After scope expansion → `Lok Sabha · Tamil Nadu, Karnataka`

This makes the current coverage auditable without opening database records.

**Rationale for this architecture**:
- The alternative (hardcoding state names in scraper files) would require a code change and
  redeployment for every new state — violating FR-043.
- Storing scope in the DB makes it auditable, versionable (via `updated_at`), and manageable
  by non-engineers through the admin panel.
- The same pattern supports future multi-country expansion: adding US Congress Lok Sabha
  equivalent simply adds a new `DataSource` record with `country_code: "US"` and appropriate
  scope — the orchestrator already filters by `country_code`.
