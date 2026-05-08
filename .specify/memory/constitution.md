<!--
SYNC IMPACT REPORT
==================
Version change: [UNVERSIONED / BLANK TEMPLATE] → 1.0.0
Bump rationale: MAJOR — first-time population of all placeholder tokens with full ElectaBase
  project identity, 5 core principles, technical standards, and operational governance.

Modified principles: N/A (initial population, no prior principles to compare against)

Added sections:
  - Core Principles (5): Truth-First, No Bias/No Toxicity/No Hallucination,
    Legal Protection, Living Website, Global Scalability
  - Technical Standards: Tech stack validation, data model (15 entities), scoring algorithms
  - Operational Standards: Data pipeline, advertisements, SEO/performance,
    security, accessibility, SpecKit prohibitions
  - Governance: Amendment procedure, versioning policy, compliance review

Templates reviewed and alignment status:
  - .specify/templates/plan-template.md → ✅ Compatible; "Constitution Check" gate applies
      ElectaBase's 5 principles as gates (truth-first, no bias, legal, living, scalability)
  - .specify/templates/spec-template.md → ✅ Compatible; requirements and entities sections
      align with ElectaBase data model and feature page list
  - .specify/templates/tasks-template.md → ✅ Compatible; phase structure maps cleanly to
      ElectaBase's data pipeline, scoring, and UI delivery phases

Follow-up TODOs / Intentionally deferred:
  - TODO(RATIFICATION_DATE): Confirm formal ratification date if different from 2026-05-08
  - TODO(SCORING_WEIGHTS): Exact numeric weights for Effectiveness and Corruption scores
      must be defined at /speckit-plan time — deferred until data availability analysis done
  - TODO(CONSTITUENCY_DEV_INDEX): Source for constituency development indices needs
      verification against authentic government data portals before including in score
-->

# ElectaBase Constitution

## Core Principles

### I. Truth-First (NON-NEGOTIABLE)

Every statistic, score, claim, or data point displayed on the public site MUST have an
attached, clickable source link pointing to an authentic, verifiable external source.
No data point may appear on the public site without a confirmed source — unsourced data
stays in draft/admin-only state until a source is attached.

Accepted authentic sources include (but are not limited to): Election Commission of India
(ECI), Lok Sabha / Rajya Sabha official portals, PRS Legislative Research, ADR (Association
for Democratic Reforms), RTI responses, official court records, Ministry of Corporate Affairs
(MCA), Income Tax filings (where publicly disclosed), official Parliament attendance records,
and reputable journalism with linked primary documents.

**Rationale**: This principle eliminates the risk of defamation, legal exposure, and public
mistrust. A single unsourced claim can discredit the entire platform.

### II. No Bias, No Toxicity, No Hallucination (NON-NEGOTIABLE)

All scoring algorithms (Effectiveness Score, Corruption Score, and any future scores) MUST
be deterministic, formula-driven, and fully auditable. The formula and its weights MUST be
publicly visible on the site.

Scores MUST derive exclusively from verifiable data points. No inferred, assumed, or
AI-hallucinated data may contribute to any score. No language on the site may be politically
charged, satirical, or editorially slanted — all copy is factual and neutral. Scores and
rankings MUST apply identical methodology to all politicians regardless of party, religion,
gender, caste, or ideology.

**Rationale**: Any perceived bias — algorithmic or editorial — will destroy credibility and
may expose the platform to targeted legal action from political actors.

### III. Legal Protection (NON-NEGOTIABLE)

A prominent, legally robust disclaimer MUST appear in the site footer, on every politician
profile page, and on the homepage. The disclaimer MUST state: (a) ElectaBase is an
informational aggregator and not a publisher of original claims; (b) all data is sourced
from publicly available authentic records with source links; (c) ElectaBase does not make
editorial judgments; (d) users are encouraged to verify all information at the linked source;
(e) correction submissions are welcome via the official correction form.

Dedicated pages at `/legal/disclaimer`, `/legal/privacy`, and `/legal/terms` MUST exist.
Any feature involving user-generated content (correction forms) MUST include spam protection
and admin approval gates — no user submission may be publicly visible without admin review.

**Rationale**: India's defamation laws and political sensitivity make legal exposure a
product-ending risk. Proactive legal framing is cheaper than reactive litigation.

### IV. Living Website (NON-NEGOTIABLE)

The site is not a static database — it is a living, auto-updating platform. A scheduled
data refresh job MUST run weekly (every Sunday at 2:00 AM IST) to pull the latest data from
authentic sources. Admins MUST be able to manually trigger a data refresh at any time from
the Admin Panel.

All refresh runs (automated or manual) MUST log: timestamp, sources polled, records updated,
and errors encountered in the `RefreshLog` table. Newly ingested records MUST be flagged
`is_verified: false` until an admin reviews and publishes them.

**Rationale**: Stale data about criminal cases, net worth, or election results is as harmful
as wrong data. The platform's credibility depends on currency.

### V. Global Scalability by Design (NON-NEGOTIABLE)

The data model, architecture, and codebase MUST support multi-country expansion from day one
— even though v1 only covers India. All database schemas MUST include a `country_code` field.
All scoring algorithms MUST be parameterized per country (different countries may have
different data availability and weight configurations).

No code, query, or UI assumption may treat India as the only possible scope.

**Rationale**: Retrofitting country-awareness into a schema designed for a single country is
a costly re-architecture. The cost of adding `country_code` from day one is near zero.

## Technical Standards

### Tech Stack (Validated Against Constraints)

The following stack satisfies all cost, performance, scalability, portability, and developer
experience constraints:

| Layer | Choice | Justification |
|---|---|---|
| Frontend | Next.js (App Router) | SSR + SSG, TypeScript-native, excellent SEO, free on Vercel |
| Database | PostgreSQL via Supabase | Relational, full-text search, open-source, free tier |
| ORM | Prisma | Type-safe, schema-first, easily migrated to self-hosted |
| Auth | Supabase Auth or NextAuth.js | Free, open-source, OAuth and magic-link support |
| Scheduler | GitHub Actions (weekly cron) + pg-boss fallback | Free tier, no extra infrastructure |
| Storage | Supabase Storage or Cloudflare R2 | Free tier, CDN-backed, exportable |
| Hosting | Vercel (Next.js) + Supabase | Free tier at MVP, horizontally scalable |
| Search | PostgreSQL FTS (v1) → Meilisearch (self-hosted) at scale | No lock-in |
| CDN | Cloudflare (free tier) | HTTPS enforcement, DDoS protection |
| Ads | Google AdSense slots in layout | Named zones, configurable ON/OFF from admin |

All tools MUST have a free tier sufficient for MVP. No paid-only dependencies are permitted
until the product demonstrates revenue.

### Data Model — Required Entities

The following 15 entities are the minimum required schema. All entities MUST include a
`country_code` field. All entities persist in PostgreSQL with Prisma-managed migrations.

1. **Politician** — core profile: demographics, photo, education, profession, net worth
2. **ElectionContest** — per-election records: type, year, constituency, result, vote share
3. **ParlamentaryTenure** — house membership per term with start/end dates
4. **PartyAffiliation** — full history of party memberships with roles and dates
5. **Party** — party registry: name, abbreviation, ideology tags, active status
6. **Achievement** — verified achievements by phase and category with source links
7. **CorruptionRecord** — verified corruption records by phase, category, case status
8. **Controversy** — controversy records by category and severity (LOW/MEDIUM/HIGH)
9. **CrimeRecord** — criminal charges with IPC section, court, status, jail time
10. **AttendanceRecord** — parliamentary attendance, questions, bills, debates per session
11. **EffectivenessScore** — versioned score with JSON breakdown and national/party/state ranks
12. **CorruptionScore** — versioned score with JSON breakdown and national/party/state ranks
13. **DataSource** — registry of approved authentic sources by type and reliability tier
14. **CorrectionSubmission** — public correction requests with admin review workflow
15. **RefreshLog** — full audit log of every automated and manual data refresh run

Every field in every entity that references an external claim MUST have a corresponding
`source_url` column. Records without a `source_url` MUST NOT be published.

### Scoring Algorithms

Both scores range 0–100, are deterministic, versioned, and computed exclusively from
verified data. Exact weights MUST be defined at plan time and published on the site.

**Effectiveness Score** (higher = more effective) inputs (weights TBD at plan):
- Parliamentary attendance percentage (normalized)
- Questions raised in Parliament (log-normalized to prevent gaming)
- Debates participated in
- Bills introduced (private member bills)
- Bills voted on / participated in
- Verified achievements (weighted by category and impact tier)
- Tenure duration (normalized — partial terms handled proportionally)
- Constituency development indices (where authentically sourced)

**Corruption Score** (higher = more corrupt) inputs (weights TBD at plan):
- Number of criminal cases filed
- Nature/severity of charges (IPC sections mapped to severity tiers)
- Conviction status (convicted > pending > acquitted weighting)
- Total jail time served
- Verified corruption records count
- Asset discrepancy (declared net worth vs. known lifestyle, where sourced)
- Electoral malpractice records

**Score rules** (both algorithms):
- A politician with zero verified records MUST score 0, not "unknown"
- Acquittals MUST reduce the Corruption Score (justice system outcome respected)
- Pending cases carry partial weight — the algorithm MUST NOT presume guilt
- No manual override of scores — only data correction flows may affect a score
- Every score computation MUST record `algorithm_version` to preserve historical scores
- Scores are recalculated on every data refresh run

## Operational Standards

### Data Pipeline

The weekly refresh pipeline (Sunday 2:00 AM IST, via GitHub Actions cron) MUST:
1. Poll all registered authentic sources in the `DataSource` table
2. Parse and normalize new/updated data
3. Diff against existing records — update only changed fields
4. Flag newly added records as `is_verified: false` — pending admin review
5. Recalculate both scores for all affected politicians
6. Write a `RefreshLog` entry with full summary
7. Send an admin notification email with the refresh summary

Admins MUST be able to trigger the same pipeline manually from `/admin/refresh`. The
triggering admin ID MUST be recorded in `RefreshLog.admin_id`.

### Advertisement Architecture

Ad zones are defined as named layout slots — not hardcoded in components. v1 zones:
`header-banner`, `sidebar-top`, `sidebar-bottom`, `in-feed`, `profile-mid`. Every ad zone
MUST display a visible "Advertisement" label above it. Ad zones MUST be configurable ON/OFF
from `/admin/ads`. AdSense integration MUST NOT negatively affect Core Web Vitals.

### SEO & Performance

- All politician profile pages MUST use SSG or SSR with `<title>`, `<meta description>`,
  OpenGraph, and Twitter Card tags
- JSON-LD structured data (Schema.org `Person`) MUST be implemented for every profile
- Sitemap MUST be auto-generated and updated on every data refresh
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Images MUST be CDN-served in WebP/AVIF format with lazy loading
- Google PageSpeed Insights mobile score MUST be ≥ 90

### Security

- The admin panel MUST be behind authentication — no public access to any `/admin/*` route
- All admin actions MUST be logged with admin ID and timestamp
- CSRF protection MUST be applied to all forms
- The correction submission form MUST be rate-limited to max 5 submissions/hour per IP
- No sensitive data (emails, admin credentials, internal logs) may be exposed via public APIs
- All API routes MUST validate and sanitize inputs
- All secrets MUST be stored as environment variables — no hardcoded credentials
- HTTPS MUST be enforced at the CDN/hosting layer

### Accessibility & Design

- WCAG 2.1 AA compliance is the minimum standard
- Mobile-first responsive design is required
- All data tables MUST be keyboard-navigable
- All images MUST have descriptive alt text
- Color contrast ratio MUST be ≥ 4.5:1 for body text
- Design MUST be clean, authoritative, and data-dense — not decorative or flashy
- Neutral color palette — no party colors may appear in UI chrome
- Only verified official photographs from authentic sources may be used for politician profiles

### SpecKit Prohibitions

SpecKit MUST NEVER generate specs, features, or content that:
- Makes unsourced claims about any politician
- Assigns a score based on AI inference rather than verified data
- Allows users to publicly post unreviewed content about politicians
- Hardcodes any politician's data in code (all data MUST be database-driven)
- Introduces political bias in UI language, score weights, or ranking systems
- Exposes admin credentials, refresh logs, or internal data via public APIs
- Uses AI-generated or stock images for politician profiles
- Bypasses the admin approval step for any correction submission
- Allows an ad to visually appear as editorial content

## Governance

This constitution is the single source of truth for all ElectaBase specs. All generated
specs, plans, tasks, and implementation decisions MUST comply with every section herein.
Contradictions between a spec and the constitution MUST be flagged and resolved before
implementation proceeds.

**Amendment Procedure**: Amendments to this constitution require: (1) explicit user approval
of the proposed change and its impact, (2) a version bump following semantic versioning rules
(MAJOR for principle removals or redefinitions; MINOR for new sections or material expansion;
PATCH for clarifications and wording), (3) a Sync Impact Report regenerated and prepended
as an HTML comment, and (4) propagation of changes to all affected templates.

**Versioning Policy**: The `algorithm_version` field on score tables MUST be incremented
whenever scoring weights or inputs change, so historical scores remain interpretable.
Constitution version and algorithm version are independent versioning tracks.

**Compliance Review**: Every plan's "Constitution Check" gate MUST verify compliance with
all five core principles before Phase 0 research begins and again after Phase 1 design.
Any spec that cannot satisfy a principle MUST flag it for resolution — not work around it.

**Future Scope (v2+) — Do Not Spec Now, Do Not Block**: Multi-country expansion, regional
language support (Hindi, Tamil, Telugu, etc.), researcher API access, mobile apps, email
alerts ("Follow a politician"), embeddable widgets, and verified politician response system.
Architecture decisions MUST NOT close off these futures.

**Version**: 1.0.0 | **Ratified**: 2026-05-08 | **Last Amended**: 2026-05-08
