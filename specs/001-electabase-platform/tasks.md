---
description: "Task list for ElectaBase — Civic-Tech Political Transparency Platform"
---

# Tasks: ElectaBase — Civic-Tech Political Transparency Platform

**Input**: Design documents from `specs/001-electabase-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: No test tasks generated — not explicitly requested in spec.md.

**Organization**: Tasks are grouped by user story. US5 (Admin + Pipeline, P1) precedes US1
(Politician Profiles, P1) because US1 requires published politician data that only the admin
pipeline can supply.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies within the phase)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All file paths are relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Bootstrap the Next.js 15 monorepo with all tooling and credentials configured.

- [X] T001 Initialize Next.js 15 project with TypeScript (strict), Tailwind CSS, and ESLint in repo root (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `.eslintrc.json`)
- [X] T002 [P] Install and configure Prisma 5 with `@prisma/client`; add `DATABASE_URL` and `DIRECT_URL` placeholders to `.env.example` (`prisma/schema.prisma` skeleton, `.env.example`)
- [X] T003 [P] Install all remaining dependencies from plan.md: `@supabase/supabase-js`, `@supabase/ssr`, `playwright`, `cheerio`, `pdf-parse`, `resend`, `react-email`, `@upstash/ratelimit`, `@upstash/redis`, `zod` (`package.json`)
- [X] T004 [P] Create `.env.example` with all required variables from quickstart.md: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `PIPELINE_SECRET`, `NEXT_PUBLIC_APP_URL` (`.env.example`)
- [X] T005 [P] Create GitHub Actions weekly cron workflow that calls `POST /api/admin/refresh` every Sunday at 20:30 UTC (= 2:00 AM IST) with `PIPELINE_SECRET` Bearer auth (`.github/workflows/weekly-refresh.yml`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared infrastructure, scoring algorithms, and base layout.
All user story phases depend on this phase being complete.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [X] T006 Write the complete Prisma schema from data-model.md: all 17 models (Politician, Party, ElectionContest, ParlamentaryTenure, PartyAffiliation, Achievement, CorruptionRecord, Controversy, CrimeRecord, AttendanceRecord, EffectivenessScore, CorruptionScore, DataSource, RefreshLog, RefreshLogSource, CorrectionSubmission, AdZone), all enums, all indexes (`prisma/schema.prisma`)
- [X] T007 Write Prisma seed script that inserts 5 DataSource records (ECI, Lok Sabha with `scope.states:["Tamil Nadu"]`, Rajya Sabha with `scope.states:null`, PRS, ADR) and 5 AdZone records (all enabled) (`prisma/seed.ts`)
- [X] T008 Run `prisma migrate dev --name init` to apply schema and generate Prisma client; commit the generated migration file (`prisma/migrations/`)
- [X] T009 [P] Write SQL migration file for the PostgreSQL full-text search trigger on `politicians` that maintains `search_vector` from `full_name || display_name || place_of_birth`, plus a Prisma migration applying it (`prisma/migrations/search_vector_trigger.sql`)
- [X] T010 [P] Create Prisma DB client singleton with connection pooling for Vercel serverless environment (`src/lib/db/client.ts`)
- [X] T011 [P] Create Supabase Auth session helpers: `getSession()`, `requireAdminSession()` (throws redirect to login if unauthenticated), `getSupabaseServerClient()` for server components (`src/lib/auth/session.ts`)
- [X] T012 [P] Create base Next.js root layout with: HTML lang attribute, Tailwind base styles, global `<Header>` and `<Footer>` components, and legal disclaimer footer text (`src/app/layout.tsx`, `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`)
- [X] T013 [P] Create `DisclaimerBanner` component for politician profile pages — displays the ElectaBase legal disclaimer text from spec FR-037 (`src/components/layout/disclaimer-banner.tsx`)
- [X] T014 [P] Create `AdZone` component: accepts `zoneKey` prop, fetches zone enabled/disabled state from DB (cached), renders AdSense slot with "Advertisement" label above it if enabled, renders nothing if disabled (`src/components/layout/ad-zone.tsx`)
- [X] T015 [P] Create `SourceBadge` component: renders a 🔗 link icon that opens `sourceUrl` in a new tab with `rel="noopener noreferrer"`; used on every data point across all profile sections (`src/components/politician/source-badge.tsx`)
- [X] T016 [P] Implement Effectiveness Score algorithm v1.0 (`effectiveness-v1.0`) from research.md: 7 components (attendance, questions, debates, private bills, bills participation, achievements, tenure duration), log-normalization, `country_code` parameterization, returns score 0–100 + full breakdown JSON (`src/lib/scoring/effectiveness.ts`)
- [X] T017 [P] Implement Corruption Score algorithm v1.0 (`corruption-v1.0`) from research.md: 6 components (criminal cases × IPC severity tier × case status modifier, convictions, jail time, corruption records, electoral malpractice, asset discrepancy), zero-record → 0, `country_code` parameterization, returns score 0–100 + full breakdown JSON (`src/lib/scoring/corruption.ts`)
- [X] T018 [P] Implement score rankings computation: given a set of politician scores, compute `rank_national`, `rank_party`, `rank_state` for each; used after batch score computation (`src/lib/scoring/rankings.ts`)
- [X] T019 [P] Implement Resend email notification service: `sendRefreshSummaryEmail(log: RefreshLog)` and `sendCorrectionApprovedEmail(submitterEmailHash: string)` using React Email templates (`src/lib/email/notifications.ts`, `src/lib/email/templates/refresh-summary.tsx`, `src/lib/email/templates/correction-approved.tsx`)
- [X] T020 [P] Create shared Zod validation schemas for all API request bodies (politician create/update, correction submission, source create/update) used across API routes (`src/lib/validation/schemas.ts`)
- [X] T021 [P] Create Next.js middleware for CSRF protection on all mutation routes (POST/PUT/DELETE) and to enforce admin authentication on all `/api/admin/*` and `/admin/*` routes (`src/middleware.ts`)

**Checkpoint**: Foundation complete — all user story phases can now begin.

---

## Phase 3: User Story 5 — Admin Panel & Scraping Pipeline (Priority: P1) 🎯 MVP

**Goal**: Admins can log in, create and publish politician records, run the scraping pipeline,
view per-source scraping logs, trigger targeted re-scrapes, and manage data sources with scope.

**Independent Test**: Authenticated admin logs in via magic link → navigates to `/admin/refresh`
→ triggers full re-scrape → sees `RefreshLog` with per-source SUCCESS/FAIL breakdown →
navigates to `/admin/politicians` → publishes a scraped record → record is visible publicly.

### Scraping Infrastructure for User Story 5

- [X] T022 [US5] Create base scraper interface and shared Playwright browser setup: `ScraperResult` type, `BaseScraper` abstract class with `scrape(source: DataSource): Promise<ScraperResult>` method, scope-reading helper that extracts `source.scraperConfig.scope.states` and passes it to each scraper (`src/lib/scrapers/base.ts`)
- [X] T023 [P] [US5] Implement ECI scraper: fetch election results pages from eci.gov.in for in-scope contests (Rajya Sabha all states + Lok Sabha Tamil Nadu); parse candidate name, constituency, year, result, vote count, vote share; return structured `ElectionContest[]` with `sourceUrl` (`src/lib/scrapers/eci.ts`)
- [X] T024 [P] [US5] Implement Lok Sabha scraper: fetch member portal at loksabha.nic.in filtered to Tamil Nadu constituencies (reads `scope.states` from DataSource config); parse member profiles, attendance records per session, questions raised, debates, private bills; return structured data with `sourceUrl` (`src/lib/scrapers/lok-sabha.ts`)
- [X] T025 [P] [US5] Implement Rajya Sabha scraper: fetch member portal at rajyasabha.nic.in for all states; parse member profiles, attendance records per session, questions raised, debates, private bills; return structured data with `sourceUrl` (`src/lib/scrapers/rajya-sabha.ts`)
- [X] T026 [P] [US5] Implement PRS scraper using Cheerio: fetch prsindia.org member pages for in-scope politicians; parse legislative participation, bills introduced, committee work; return structured data with `sourceUrl` (`src/lib/scrapers/prs.ts`)
- [X] T027 [P] [US5] Implement ADR scraper using Cheerio + pdf-parse: fetch adrindia.org affidavit pages for in-scope politicians; parse criminal cases, assets, liabilities from affidavit PDFs; return structured `CrimeRecord[]` and net worth data with `sourceUrl` (`src/lib/scrapers/adr.ts`)
- [X] T028 [US5] Implement pipeline orchestrator: `runFullPipeline()` runs all active DataSources in sequence, `runTargetedPipeline(sourceId)` runs one source; both call `diffAndUpsert()` to update only changed records, flag new records as `is_verified:false`, then call scorer for affected politicians only, then write `RefreshLog` with `RefreshLogSource[]` entries, then call `sendRefreshSummaryEmail()` (`src/lib/pipeline/orchestrator.ts`, `src/lib/pipeline/diff.ts`)

### Admin API Routes for User Story 5

- [X] T029 [P] [US5] Implement `POST /api/admin/refresh` — verifies `PIPELINE_SECRET` Bearer token OR valid admin session, calls `runFullPipeline()`, returns 202 with `refreshLogId` (`src/app/api/admin/refresh/route.ts`)
- [X] T030 [P] [US5] Implement `POST /api/admin/refresh/[sourceId]` — calls `runTargetedPipeline(sourceId)`, returns 202 with `refreshLogId` and `sourceId` (`src/app/api/admin/refresh/[sourceId]/route.ts`)
- [X] T031 [P] [US5] Implement `GET /api/admin/refresh/logs` — returns paginated `RefreshLog[]` with nested `RefreshLogSource[]` per run as defined in contracts/api.md (`src/app/api/admin/refresh/logs/route.ts`)
- [X] T032 [P] [US5] Implement admin politician CRUD API: `GET /api/admin/politicians` (list including drafts), `POST /api/admin/politicians` (create draft), `PUT /api/admin/politicians/[id]` (update), `DELETE /api/admin/politicians/[id]` (soft-delete: `isPublished:false`) (`src/app/api/admin/politicians/route.ts`, `src/app/api/admin/politicians/[id]/route.ts`)
- [X] T033 [P] [US5] Implement `POST /api/admin/politicians/[id]/publish` — validates all required `source_url` fields present before publishing; returns 400 with list of missing fields if validation fails, else sets `isPublished:true` (`src/app/api/admin/politicians/[id]/publish/route.ts`)
- [X] T034 [P] [US5] Implement `POST /api/admin/politicians/[id]/rescore` — triggers score recomputation for one politician (`src/app/api/admin/politicians/[id]/rescore/route.ts`)
- [X] T035 [P] [US5] Implement `POST /api/admin/scores/recalculate-all` — triggers async full score recomputation for all published politicians; returns 202 immediately (`src/app/api/admin/scores/recalculate-all/route.ts`)
- [X] T036 [P] [US5] Implement `GET/POST/PUT /api/admin/sources` — DataSource CRUD; PUT includes ability to update `scraperConfig.scope.states` to expand Lok Sabha coverage (`src/app/api/admin/sources/route.ts`, `src/app/api/admin/sources/[id]/route.ts`)
- [X] T037 [P] [US5] Implement `GET/PUT /api/admin/ads` — read and toggle `AdZone.isEnabled` per `zoneKey` (`src/app/api/admin/ads/route.ts`)

### Admin UI Pages for User Story 5

- [X] T038 [US5] Implement admin layout with Supabase Auth session guard: unauthenticated requests redirect to `/admin/login`; authenticated requests render admin shell with navigation sidebar (`src/app/admin/layout.tsx`, `src/app/admin/login/page.tsx`)
- [X] T039 [P] [US5] Implement admin dashboard: pending corrections count, last refresh status + timestamp, total published politicians count, quick links to key admin sections (`src/app/admin/page.tsx`)
- [X] T040 [P] [US5] Implement admin politicians list page: table of all politicians (published + draft), with publish/unpublish toggle, edit link, and delete action (`src/app/admin/politicians/page.tsx`)
- [X] T041 [P] [US5] Implement politician create/edit form: all Politician fields from data-model.md, source URL fields per data point, save-as-draft and publish actions; validates source URLs present before publish (`src/app/admin/politicians/new/page.tsx`, `src/app/admin/politicians/[id]/page.tsx`, `src/components/admin/politician-form.tsx`)
- [X] T042 [P] [US5] Implement admin refresh page: "Run Full Refresh" button (calls `POST /api/admin/refresh`), paginated refresh log table showing per-run overall status and per-source breakdown (SUCCESS/PARTIAL/FAILED, records scraped, error detail, duration) (`src/app/admin/refresh/page.tsx`, `src/components/admin/refresh-log-table.tsx`, `src/components/admin/source-scrape-status.tsx`)
- [X] T043 [P] [US5] Implement admin sources page: table of all DataSources showing name, URL, type, reliability tier, active status, and Scope badge (e.g. "Lok Sabha · Tamil Nadu" or "Rajya Sabha · All States"); "Trigger Scrape" button per source; edit form includes `scope.states` field for Lok Sabha expansion (`src/app/admin/sources/page.tsx`, `src/app/admin/sources/[id]/page.tsx`)
- [X] T044 [P] [US5] Implement admin scores page: "Recalculate All Scores" button; table of recent score computation logs per politician (`src/app/admin/scores/page.tsx`)
- [X] T045 [P] [US5] Implement admin ads management page: toggle ON/OFF per named ad zone; shows zone key and current status (`src/app/admin/ads/page.tsx`)

**Checkpoint**: US5 complete — admin can scrape data, publish records, and monitor pipeline. US1 can now begin.

---

## Phase 4: User Story 1 — Voter Researches a Politician Profile (Priority: P1) 🎯 MVP

**Goal**: Visitors can search for and view a complete, source-linked politician profile with
scores, election history, attendance, crime records, achievements, and all other data points.

**Independent Test**: Navigate to `/politicians` → search for a published politician → land on
profile page → verify every displayed data point has a visible SourceBadge → verify
Effectiveness Score and Corruption Score display with national rank and working breakdown modal.

### Public API Routes for User Story 1

- [X] T046 [P] [US1] Implement `GET /api/politicians` — paginated list of published politicians with filters (party, state, house, gender, education, score range) and PostgreSQL FTS search via `search_vector`; returns summary shape from contracts/api.md (`src/app/api/politicians/route.ts`)
- [X] T047 [P] [US1] Implement `GET /api/politicians/search?q=` — full-text search using `search_vector` GIN index; returns top 10 matches with slug, name, party, photo (`src/app/api/politicians/search/route.ts`)
- [X] T048 [P] [US1] Implement `GET /api/politicians/[slug]` — full profile with all relations (electionContests, parliamentaryTenures, partyAffiliations, achievements, corruptionRecords, controversies, crimeRecords, attendanceRecords, latest effectivenessScore, latest corruptionScore); only published records returned; response shape from contracts/api.md (`src/app/api/politicians/[slug]/route.ts`)
- [X] T049 [P] [US1] Implement `GET /api/parties` and `GET /api/parties/[slug]` — party list and full party profile with member list and aggregate scores (`src/app/api/parties/route.ts`, `src/app/api/parties/[slug]/route.ts`)

### UI Components for User Story 1

- [X] T050 [P] [US1] Implement `ScoreCard` component: displays score (0–100), national rank, party rank, state rank; "Insufficient Data" state when no attendance records exist; clicking score opens `ScoreBreakdownModal` (`src/components/politician/score-card.tsx`)
- [X] T051 [P] [US1] Implement `ScoreBreakdownModal`: displays formula components and their weights from the score's `scoreBreakdown` JSON; shows `algorithm_version` (`src/components/politician/score-breakdown-modal.tsx`)
- [X] T052 [P] [US1] Implement `CorrectionLink` component: small "Suggest Correction" link rendered next to each editable data point; links to `/corrections?politicianId={id}&field={fieldName}` (`src/components/politician/correction-link.tsx`)

### Public Pages for User Story 1

- [X] T053 [US1] Implement homepage (`/`): global search bar (calls `/api/politicians/search`), featured politicians section, leaderboard snippets (top 5 effective + top 5 corruption score), site stats (total politicians, total records, last refresh date), Coverage Notice banner explaining v1 Lok Sabha scope, legal disclaimer (`src/app/(public)/page.tsx`)
- [X] T054 [P] [US1] Implement politicians list page (`/politicians`): server-side rendered paginated list with advanced filter sidebar (party, state, house, gender, education, score ranges), full-text search input, Coverage Notice banner for Lok Sabha scope (`src/app/(public)/politicians/page.tsx`)
- [X] T055 [US1] Implement politician profile page (`/politicians/[slug]`) with SSR and ISR: profile header (photo, name, age, gender, education, party, net worth — each with SourceBadge and CorrectionLink), then tabbed or sectioned layout for: Election History, Parliamentary Tenures, Party History, Achievements, Corruption Records, Crime Records, Controversies, Parliamentary Attendance, Effectiveness Score card, Corruption Score card; DisclaimerBanner at top; empty state "No verified records on file" for sections with no data (`src/app/(public)/politicians/[slug]/page.tsx`, `src/components/politician/profile-header.tsx`, `src/components/politician/election-history.tsx`, `src/components/politician/attendance-table.tsx`, `src/components/politician/crime-records.tsx`)
- [X] T056 [P] [US1] Add OpenGraph tags (`og:title`, `og:description`, `og:image`), Twitter Card tags, and JSON-LD Schema.org Person structured data to the politician profile page (`src/app/(public)/politicians/[slug]/page.tsx`)
- [X] T057 [P] [US1] Implement parties list and party profile pages (`/parties`, `/parties/[slug]`): party profile shows all affiliated politicians, aggregate effectiveness/corruption/attendance scores, election history (`src/app/(public)/parties/page.tsx`, `src/app/(public)/parties/[slug]/page.tsx`)
- [X] T058 [P] [US1] Implement elections browse page (`/elections`): filterable by year, type (Lok Sabha / Rajya Sabha), state (`src/app/(public)/elections/page.tsx`)
- [X] T059 [P] [US1] Implement about page (`/about`): ElectaBase mission, methodology section, full Effectiveness Score formula with all weights and component descriptions, full Corruption Score formula with IPC severity tier table, algorithm version numbers, data sources list with reliability tiers (`src/app/(public)/about/page.tsx`)
- [X] T060 [P] [US1] Implement all three legal pages: `/legal/disclaimer` (full disclaimer text from constitution §2.3), `/legal/privacy` (DPDP Act compliance, data collected, email anonymisation policy), `/legal/terms` (`src/app/(public)/legal/disclaimer/page.tsx`, `src/app/(public)/legal/privacy/page.tsx`, `src/app/(public)/legal/terms/page.tsx`)
- [X] T061 [P] [US1] Implement `CoverageNotice` component: dismissible banner explaining "v1 coverage: Rajya Sabha (all states) + Lok Sabha (Tamil Nadu only)"; displayed on homepage, politicians list, and search results pages (`src/components/ui/coverage-notice.tsx`)
- [X] T062 [P] [US1] Implement auto-generated sitemap (`sitemap.ts`) and `robots.txt` that includes all published politician profile URLs; register revalidation trigger on data refresh (`src/app/sitemap.ts`, `src/app/robots.ts`)

**Checkpoint**: US1 complete — voter can find and fully review any politician within v1 scope.

---

## Phase 5: User Story 2 — Journalist Compares Politicians (Priority: P2)

**Goal**: Visitors can select 2–4 politicians and compare all parameters side-by-side.

**Independent Test**: Navigate to `/compare` → select 4 politicians → comparison table renders
with all parameters → click a score cell → score breakdown modal opens correctly.

- [X] T063 [P] [US2] Implement `GET /api/compare?ids=slug1,slug2,...` — validates 2–4 slugs, returns array of full politician profiles; 400 if fewer than 2 or more than 4 (`src/app/api/compare/route.ts`)
- [X] T064 [US2] Implement compare page (`/compare`): politician selector with search autocomplete (max 4, prevents adding a 5th with error message), side-by-side comparison table with one column per politician and rows for every comparable parameter (both scores with rank, attendance %, questions raised, debates, private bills, crime count, corruption record count, election wins, tenures); score cells open `ScoreBreakdownModal` on click; each cell has `SourceBadge` (`src/app/(public)/compare/page.tsx`, `src/components/compare/politician-selector.tsx`, `src/components/compare/comparison-table.tsx`)

**Checkpoint**: US2 complete — journalist can compare up to 4 politicians side-by-side.

---

## Phase 6: User Story 3 — Researcher Explores Leaderboards (Priority: P2)

**Goal**: Visitors can browse national rankings across score categories with state/party/house filters.

**Independent Test**: Navigate to `/leaderboards` → select "Most Corrupt" tab → apply "Tamil Nadu"
state filter → ranked list updates → click a politician → navigates to their profile.

- [X] T065 [P] [US3] Implement `GET /api/leaderboards?category=effectiveness&state=&party=&house=&page=&limit=` — returns ranked list for specified category; categories: `effectiveness`, `corruption`, `attendance`, `questions`, `bills` (`src/app/api/leaderboards/route.ts`)
- [X] T066 [US3] Implement leaderboards page (`/leaderboards`): tab navigation for each category (Most Effective, Most Corrupt, Best Attendance, Most Questions Raised, Most Bills Introduced), filter controls (state, party, house), ranked table with politician name, party, score/metric, and link to profile; updates on filter change (`src/app/(public)/leaderboards/page.tsx`, `src/components/leaderboard/leaderboard-table.tsx`)

**Checkpoint**: US3 complete — researcher can explore and filter national rankings.

---

## Phase 7: User Story 4 — Visitor Submits a Data Correction (Priority: P3)

**Goal**: Visitors can flag incorrect data, track correction status, and admins can approve/reject.
Approved corrections go live immediately; email is anonymised after terminal state.

**Independent Test**: Submit a correction via `/corrections` → confirm rate limit (6th submission
rejected) → check `/corrections/[id]` shows PENDING → admin approves from `/admin/corrections`
→ politician profile reflects the corrected value → submitter email no longer in `submitted_by_email`.

- [X] T067 [P] [US4] Implement `POST /api/corrections` — validate body with Zod schema, apply Upstash rate limit (5/hour per IP using `src/lib/rate-limit/corrections.ts`), store `CorrectionSubmission` with `status:PENDING`, return `{id, statusUrl}` (`src/app/api/corrections/route.ts`)
- [X] T068 [P] [US4] Implement `GET /api/corrections/[id]` — public endpoint returning `{id, status, createdAt}` only; no email or review notes exposed (`src/app/api/corrections/[id]/route.ts`)
- [X] T069 [P] [US4] Implement admin correction review API: `POST /api/admin/corrections/[id]/approve` — updates target field in DB, sets `status:APPROVED`, anonymises email (`submitted_by_email→null`, `email_hash→SHA256(email)`), logs `reviewed_by_admin_id` and `reviewed_at`; `POST /api/admin/corrections/[id]/reject` — sets `status:REJECTED`, anonymises email, logs review (`src/app/api/admin/corrections/[id]/approve/route.ts`, `src/app/api/admin/corrections/[id]/reject/route.ts`)
- [X] T070 [US4] Implement public correction submission form page (`/corrections`): all required fields from spec FR-022 (politician selector, field in question, current value, suggested value, reason, evidence URL, email), spam protection honeypot field, CAPTCHA integration (Cloudflare Turnstile free tier), rate-limit error message, submission confirmation page with status URL (`src/app/(public)/corrections/page.tsx`)
- [X] T071 [P] [US4] Implement correction status page (`/corrections/[id]`): displays current status (PENDING / APPROVED / REJECTED) and creation date; no sensitive data shown (`src/app/(public)/corrections/[id]/page.tsx`)
- [X] T072 [P] [US4] Implement admin corrections review queue page (`/admin/corrections`): filterable table by status (PENDING / APPROVED / REJECTED), each pending item shows field, current value, suggested value, reason, evidence URL link, submitter email (admin-only); approve/reject buttons with optional review note (`src/app/admin/corrections/page.tsx`, `src/components/admin/correction-review-card.tsx`)
- [X] T073 [P] [US4] Implement Upstash rate limiter for correction submissions: `checkCorrectionRateLimit(ip: string): Promise<{allowed: boolean; remaining: number}>`, max 5/hour per IP (`src/lib/rate-limit/corrections.ts`)

**Checkpoint**: US4 complete — correction flow is fully operational end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Performance, accessibility, security hardening, and final validation.

- [X] T074 [P] Configure Next.js `next/image` for all politician photos: define `remotePatterns` for Supabase Storage domain, enable WebP/AVIF format, add lazy loading by default; add `alt` text generation from politician name (`next.config.ts`)
- [X] T075 [P] Add Zod input validation and sanitization to all public API routes that accept query params or bodies: `/api/politicians`, `/api/compare`, `/api/leaderboards`, `/api/corrections` (`src/app/api/*/route.ts` — all public routes)
- [X] T076 [P] WCAG 2.1 AA audit pass: add `scope` attributes to all data tables for keyboard navigation, add `aria-label` to all icon-only buttons (SourceBadge, correction link), verify color contrast ≥ 4.5:1 for all body text in the Tailwind theme (`tailwind.config.ts`, affected components)
- [X] T077 [P] Run Lighthouse/PageSpeed audit in Chrome DevTools against `/politicians/[slug]`; optimize for LCP < 2.5s — add `priority` prop to above-fold politician photo, implement ISR with `revalidate` for profile pages, move below-fold sections to client-side load if needed (`src/app/(public)/politicians/[slug]/page.tsx`)
- [X] T078 [P] Security audit: verify no admin data (emails, credentials, refresh logs) leaks through public API routes; verify `requireAdminSession()` is called in all `/api/admin/*` routes; verify `PIPELINE_SECRET` is checked in refresh endpoint; verify HTTPS redirect is configured in Vercel project settings
- [X] T079 Run the quickstart.md validation checklist end-to-end: dev server starts, `/politicians` loads, `/admin` redirects unauthenticated, magic-link login works, manual scrape trigger creates `RefreshLog`, rate limit blocks 6th correction submission

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US5/Phase 3**: Depends on Phase 2 — scraping pipeline and admin panel
- **US1/Phase 4**: Depends on Phase 2 + Phase 3 (published data must exist for profile testing)
- **US2/Phase 5**: Depends on Phase 4 (compare uses politician profile data)
- **US3/Phase 6**: Depends on Phase 4 (leaderboards use computed scores)
- **US4/Phase 7**: Depends on Phase 2 (corrections use CorrectionSubmission model)
- **Polish (Phase 8)**: Depends on all user story phases

### User Story Dependencies

- **US5 (P1)**: After Phase 2 → no dependencies on other stories
- **US1 (P1)**: After Phase 2 + US5 → requires published politician data
- **US2 (P2)**: After US1 → uses same profile data shape
- **US3 (P2)**: After US1 → uses computed scores from US5/US1
- **US4 (P3)**: After Phase 2 → can be developed in parallel with US1

### Within Each Phase

- Models before services
- Services before API routes
- API routes before UI pages
- Shared components (SourceBadge, ScoreCard) before pages that use them

### Parallel Opportunities

All tasks marked `[P]` within a phase can be worked on simultaneously.
- Phase 2: T009–T021 (13 parallel tasks)
- Phase 3: T023–T027 (5 scraper tasks), T029–T037 (9 admin API tasks), T039–T045 (7 admin UI tasks)
- Phase 4: T046–T052 (7 tasks), T056–T062 (7 tasks)
- Phase 5: T063 is parallel setup for T064
- Phase 7: T067–T069, T071–T073 (6 parallel tasks)

---

## Parallel Example: Phase 2 Foundation

```bash
# These can run simultaneously (different files):
Task T009: Write search vector SQL trigger
Task T010: Create Prisma DB client singleton
Task T011: Create Supabase Auth session helpers
Task T015: Create SourceBadge component
Task T016: Implement Effectiveness Score algorithm
Task T017: Implement Corruption Score algorithm
Task T018: Implement rankings computation
Task T019: Implement Resend email service

# Then sequentially:
Task T006 → T008: Write schema → run migration (T007 seed runs after T008)
```

---

## Implementation Strategy

### MVP First (US5 + US1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3 (US5): Admin + Pipeline — scrape and publish a handful of records
4. Complete Phase 4 (US1): Politician profiles visible publicly
5. **STOP and VALIDATE**: Full voter research flow works end-to-end
6. Deploy to Vercel + Supabase free tier

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US5 complete → data in system, admin workflow live
3. US1 complete → public profiles live (MVP deployed)
4. US2 complete → compare tool live
5. US3 complete → leaderboards live
6. US4 complete → correction workflow live
7. Polish → performance + security hardened

### Parallel Team Strategy

With 2 developers after Phase 2:
- Developer A: US5 (admin panel + scrapers)
- Developer B: US4 (correction flow, independent of data pipeline)

After US5 completes:
- Developer A: US1 (public profiles)
- Developer B: US2 + US3 (compare + leaderboards, can build against API contract before data is live)

---

## Notes

- `[P]` = parallelizable (different files, no intra-phase dependencies)
- `[Story]` label maps each task to its user story for traceability
- Every task includes exact file paths — sufficient for an LLM to execute without extra context
- No test tasks generated (not requested in spec.md)
- Scoped Lok Sabha expansion (future states) requires only updating `DataSource.scraperConfig.scope.states` — no code tasks needed
- Verify tests fail before implementing (if tests are added later via `/speckit-tasks --tdd`)
- Commit after each phase checkpoint
