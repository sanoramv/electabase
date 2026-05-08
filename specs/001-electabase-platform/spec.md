# Feature Specification: ElectaBase — Civic-Tech Political Transparency Platform

**Feature Branch**: `001-electabase-platform`
**Created**: 2026-05-08
**Status**: Draft
**Input**: User description: "Build a civic-tech political transparency database website for India called ElectaBase"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Voter Researches a Politician Before Voting (Priority: P1)

A first-time voter wants to look up a specific MP before casting their vote. They search by name,
land on the politician's profile, and review their election history, parliamentary attendance,
achievements, crime records, and both scores — each item backed by a clickable source link.

**Why this priority**: This is the core value proposition of the platform. Every other feature
exists to make this journey possible. Without complete, sourced politician profiles, the product
has no purpose.

**Independent Test**: A politician record with all mandatory fields populated and published is
accessible at `/politicians/[slug]`. Every displayed data point has a visible, working source
link. The Effectiveness Score and Corruption Score are displayed with their national ranks.

**Acceptance Scenarios**:

1. **Given** a published politician record exists, **When** a visitor navigates to
   `/politicians/[slug]`, **Then** they see: full name, photo, date of birth, place of birth,
   age, gender, education, businesses, party history, constituencies — each with a source badge.
2. **Given** the politician has election contest records, **When** the visitor views the
   Elections section, **Then** they see: year, house, constituency, result (WON/LOST), vote
   share, and a clickable source link for each contest.
3. **Given** the politician has attendance records, **When** the visitor views Attendance,
   **Then** they see: sessions attended vs. total sessions, attendance %, questions raised,
   debates participated, private bills introduced — all with source links.
4. **Given** the politician has crime records, **When** the visitor views Crime Records,
   **Then** they see: charge description, IPC section, court name, case status, verdict date,
   jail time — each with a source link.
5. **Given** any data point lacks a source URL, **Then** that data point is NOT displayed to
   public visitors — it remains in draft/admin-only state.

---

### User Story 2 — Journalist Compares Politicians Across Parameters (Priority: P2)

A journalist researching corruption patterns wants to compare multiple politicians side-by-side
across scores, crime records, attendance, and election history to identify patterns for a story.

**Why this priority**: The compare tool multiplies research productivity and drives repeat
visits from the journalist and researcher segments. It is a differentiated feature not available
on most civic data portals.

**Independent Test**: A visitor selects 2–4 politicians via the Compare tool at `/compare`.
A structured side-by-side table renders all comparable parameters. Each cell has a source badge.

**Acceptance Scenarios**:

1. **Given** a visitor is on `/compare`, **When** they search and select 2–4 politicians,
   **Then** a comparison table renders with one column per politician and rows for every
   comparable parameter (scores, attendance, crime count, achievements, election wins, etc.).
2. **Given** a politician is selected for comparison, **When** the visitor views a score cell,
   **Then** clicking the score opens the full formula breakdown for that politician.
3. **Given** a comparison is active, **When** the visitor wants to add a fifth politician,
   **Then** the system prevents selection and displays a message that the maximum is 4.

---

### User Story 3 — Researcher Explores Leaderboards and Filters (Priority: P2)

A researcher studying parliamentary effectiveness wants to see national rankings filtered by
party, state, house, and year. They browse leaderboards, apply filters, and follow source links
for their analysis.

**Why this priority**: Leaderboards and filters drive discovery and engagement from the
researcher segment, and they surface the platform's scoring methodology in an accessible way.

**Independent Test**: A visitor navigates to `/leaderboards` and applies filters (party, state,
house). The ranked list updates. Each entry links to the politician's full profile.

**Acceptance Scenarios**:

1. **Given** computed scores exist, **When** a visitor views `/leaderboards`, **Then** they
   see tabs or sections for: Most Effective, Most Corrupt, Best Attendance, Most Questions
   Raised, Most Bills Introduced — each ranked nationally with politician name, party, and score.
2. **Given** the visitor applies a state filter, **When** the leaderboard updates, **Then**
   only politicians from that state are shown, ranked within that state.
3. **Given** the visitor clicks a politician in the leaderboard, **Then** they navigate to
   the politician's full profile page.

---

### User Story 4 — Visitor Submits a Data Correction (Priority: P3)

A politically active citizen notices an incorrect crime record on a politician's profile. They
use the "Suggest Correction" link on that specific data point, submit evidence, and can track
the correction status via a unique URL.

**Why this priority**: The correction flow is how the platform maintains accuracy over time
and builds community trust — but it is gated behind admin review, so errors cannot be
introduced by bad actors.

**Independent Test**: A visitor submits a correction via `/corrections`. A confirmation page
with a unique status URL appears. The correction is NOT reflected on the public profile until
an admin approves it. The submission is visible in the admin panel under pending corrections.

**Acceptance Scenarios**:

1. **Given** a visitor clicks "Suggest Correction" on a data point, **When** they complete
   the form (field, current value, suggested value, reason, evidence URL, email), **Then** the
   submission is stored with `status: PENDING` and a unique ID is assigned.
2. **Given** the form is submitted, **When** more than 5 correction submissions have come from
   the same IP in the past hour, **Then** the submission is rejected with a rate-limit message.
3. **Given** the submission is pending, **When** the visitor navigates to
   `/corrections/[id]`, **Then** they see the current status (PENDING, APPROVED, or REJECTED).
4. **Given** the admin approves the correction, **When** a visitor views the politician's
   public profile, **Then** the corrected data point is live with the updated value.
5. **Given** the admin rejects the correction, **When** the submitter visits the status page,
   **Then** they see the REJECTED status and the public profile is unchanged.

---

### User Story 5 — Admin Manages Politician Records and Data Refresh (Priority: P1)

An admin user logs into the admin panel, adds a new politician record with all mandatory fields
and source links, publishes it, and triggers a manual data refresh to pull latest data. They
monitor the refresh log and review the summary of updated records.

**Why this priority**: Without the admin workflow, no data enters the platform. The admin panel
is the supply-side foundation of the entire product.

**Independent Test**: An authenticated admin can log in, create a politician record, attach all
required source URLs, publish it (making it publicly visible), trigger a manual refresh, and
view the resulting `RefreshLog` entry.

**Acceptance Scenarios**:

1. **Given** an admin is authenticated, **When** they navigate to `/admin/politicians/new`,
   **Then** they can fill in all politician fields, attach source URLs, save as draft, and
   publish when ready.
2. **Given** a politician record is saved as draft (unpublished), **When** a public visitor
   tries to access the politician's profile URL, **Then** the profile is not accessible.
3. **Given** an admin clicks "Run Refresh Now" at `/admin/refresh`, **When** the refresh
   pipeline completes, **Then** a `RefreshLog` entry appears with: timestamp, triggered_by,
   records updated, records added, errors, and admin ID.
4. **Given** a scheduled refresh runs (Sunday 2 AM IST), **When** new data is ingested,
   **Then** new records are flagged `is_verified: false` — not published — until admin reviews.
5. **Given** an admin views `/admin/corrections`, **When** they approve a pending correction,
   **Then** the data is updated in the database and the correction status changes to APPROVED.

---

### Edge Cases

- What happens when a politician has contested under multiple parties across different elections?
  → All affiliations appear in chronological order in the Party History section.
- What happens when a politician has no crime records or corruption records?
  → Sections display an explicit "No verified records on file" message — not blank.
- What happens when a score cannot be computed because attendance data is missing?
  → The score displays as "Insufficient Data" with an explanation — it does not default to 0.
- What happens when the weekly refresh encounters an unreachable source?
  → The error is logged in `RefreshLog.errors`. Existing data is preserved. Admin is notified.
- What happens when an admin deletes a politician who has pending correction submissions?
  → The politician is unpublished (soft-deleted). Correction submissions remain for audit.
- What happens when two admins simultaneously edit the same politician record?
  → Last-write-wins with an `updated_at` timestamp. Future versions may add optimistic locking.
- What happens when a visitor searches for a Lok Sabha politician from a state not in v1 scope
  (e.g. a Bihar MP)?
  → The search returns no results for that politician. A persistent "Coverage Notice" banner
  on the search and politician list pages explains that Lok Sabha coverage in v1 is limited to
  Tamil Nadu, and invites users to check back as more states are added.
- What happens when an admin wants to expand coverage to a new Lok Sabha state?
  → They update the Lok Sabha `DataSource` record's `scraperConfig.scope.states` array in the
  admin panel to include the new state name. The next scraping run (scheduled or triggered
  manually) will collect data for the new state. No code change or redeployment is required.

## Requirements *(mandatory)*

### Functional Requirements

**Politician Profiles**

- **FR-001**: The system MUST maintain a database of politicians within the following v1 scope:
  (a) ALL politicians who have contested or served in Rajya Sabha — all states, all years;
  (b) ALL politicians who have contested or served in Lok Sabha from Tamil Nadu — all Tamil Nadu
  constituencies, all years. Lok Sabha politicians from all other Indian states are explicitly
  out of scope for v1. The data model and scraping pipeline MUST be designed so that expanding
  to additional Lok Sabha states in future versions requires only configuration changes —
  no schema migrations and no architectural changes.
- **FR-002**: Each politician record MUST include: full name, display name, photo, date of
  birth, place of birth, gender, highest education, education institution, profession before
  politics, current profession, businesses owned (structured list), declared net worth,
  current political party, and publication status.
- **FR-003**: The system MUST calculate and display a politician's current age from their date
  of birth dynamically — no separate stored age field is required.
- **FR-004**: Each politician profile MUST display: election contest history, parliamentary
  tenure history, party affiliation history, achievements, corruption records, crime records,
  controversies, attendance records, Effectiveness Score, and Corruption Score.
- **FR-005**: Every data point displayed publicly MUST have an associated, clickable source URL
  pointing to an authentic external source. Records without a source URL MUST NOT appear on
  public pages.

**Election and Tenure Records**

- **FR-006**: The system MUST store and display each election contest with: election type
  (Lok Sabha / Rajya Sabha / State / Other), year, constituency, state, result
  (WON / LOST / DISQUALIFIED), vote count, vote share percentage, and source URL.
- **FR-007**: The system MUST store and display parliamentary tenure records with: house
  (Lok Sabha / Rajya Sabha), constituency, state, term start date, term end date, and
  source URL.

**Scores**

- **FR-008**: The system MUST compute and display an Effectiveness Score (0–100) for each
  politician with a national rank, party rank, and state rank. The full scoring formula and all
  weights MUST be publicly visible on the site at `/about`.
- **FR-009**: The system MUST compute and display a Corruption Score (0–100) for each
  politician with a national rank, party rank, and state rank. The full scoring formula and all
  weights MUST be publicly visible at `/about`.
- **FR-010**: Both scores MUST be deterministic, formula-driven, derived exclusively from
  verified data points, and recalculated on every data refresh. No AI-inferred or hallucinated
  data may contribute to any score.
- **FR-011**: Score computation MUST store a `score_breakdown` JSON field showing each
  component's contribution, and an `algorithm_version` field so historical scores are preserved
  when the formula changes.
- **FR-012**: A politician with zero verified negative records MUST score 0 on the Corruption
  Score — not "unknown". A politician with insufficient attendance data MUST display
  "Insufficient Data" on the Effectiveness Score — not a computed 0.

**Source Transparency**

- **FR-013**: Every data record (achievement, crime, controversy, corruption, attendance,
  election, tenure) MUST have a source URL field. The UI MUST render a visible source badge
  next to each data point that opens the source URL in a new tab.
- **FR-014**: The admin panel MUST enforce that a source URL is provided before any record can
  be published to the public site.

**Search, Filter, and Discovery**

- **FR-015**: The system MUST provide full-text search across politician name, party,
  constituency, and state — returning results in under 2 seconds for 95% of queries.
- **FR-016**: The politician list at `/politicians` MUST support filtering by: party, state,
  election year, house (Lok Sabha / Rajya Sabha), score range, gender, and education level.
- **FR-017**: The system MUST provide a leaderboard at `/leaderboards` with rankings for:
  Most Effective, Most Corrupt, Best Attendance, Most Questions Raised, and Most Bills
  Introduced — with filters for state, party, and house.

**Compare Tool**

- **FR-018**: The system MUST provide a side-by-side comparison tool at `/compare` supporting
  2–4 politicians simultaneously, showing all comparable parameters in a structured table.
- **FR-019**: Clicking any score in the comparison table MUST open a modal displaying the full
  score formula breakdown for that politician.

**Party Profiles**

- **FR-020**: The system MUST maintain a party registry with: name, abbreviation, logo,
  founded year, ideology tags, and active status.
- **FR-021**: Each party profile at `/parties/[slug]` MUST display: all affiliated politicians
  (current and historical), aggregate scores, and election history.

**Correction Submissions**

- **FR-022**: Any visitor MUST be able to submit a data correction via `/corrections` providing:
  politician, field in question, current value, suggested value, reason, evidence URL, and
  email address.
- **FR-023**: Correction submissions MUST be rate-limited to a maximum of 5 submissions per
  hour per IP address.
- **FR-023a**: The submitter's email address MUST be visible only to authenticated admins —
  never exposed in any public API or page. Once a correction reaches a terminal state
  (APPROVED or REJECTED), the email MUST be replaced with a one-way hash in the stored
  record (anonymisation), while the correction audit trail is preserved. This satisfies
  India's DPDP Act 2023 data minimisation requirement.
- **FR-024**: Submitted corrections MUST be stored with `status: PENDING` and MUST NOT be
  reflected on the public site until an admin explicitly approves them.
- **FR-025**: Each submission MUST receive a unique ID and a public status page at
  `/corrections/[id]`.

**Data Scraping Pipeline**

- **FR-026**: The data pipeline MUST include dedicated scrapers for each of the following
  government and civic data sources: Election Commission of India (eci.gov.in), Lok Sabha
  portal (loksabha.nic.in), Rajya Sabha portal (rajyasabha.nic.in), PRS Legislative Research
  (prsindia.org), and ADR — Association for Democratic Reforms (adrindia.org). Each scraper
  MUST be independently runnable and driven by configuration in the `DataSource` registry.
  The v1 scraping scope is: Rajya Sabha (all states, all years) and Lok Sabha (Tamil Nadu
  only, all years). The Lok Sabha scraper MUST filter by the states listed in its
  `DataSource.scraperConfig.scope.states` field — Tamil Nadu for v1.
- **FR-026a**: The initial bulk data load MUST be performed by executing the full scraper
  pipeline for the first time — there is no separate import mechanism. The first run and all
  subsequent weekly scheduled runs use the identical scraping pipeline.
- **FR-027**: The system MUST run the full scraping pipeline automatically every Sunday at
  2:00 AM IST. Newly scraped records MUST be flagged `is_verified: false` and held in
  draft/unpublished state pending admin review before appearing publicly. After each run,
  scores MUST be recalculated only for politicians whose underlying data changed — not the
  entire database.
- **FR-027a**: Admins MUST be able to trigger a full re-scrape of all sources from
  `/admin/refresh` at any time. Admins MUST also be able to trigger a targeted re-scrape of
  a single source from `/admin/sources/[id]` without running the full pipeline.
- **FR-028**: Every scraping run MUST write a `RefreshLog` entry capturing: trigger type
  (SCHEDULED / ADMIN / TARGETED), start timestamp, completion timestamp, overall status,
  records updated, records added, admin ID (for manual triggers), and a per-source breakdown
  including: source name, URL, scrape status (SUCCESS / PARTIAL / FAILED), records scraped,
  and error detail if failed.
- **FR-029**: After each refresh run, admin(s) MUST receive an email notification summarising
  overall results and highlighting any sources that returned PARTIAL or FAILED status.

**Admin Panel**

- **FR-030**: The admin panel (`/admin/*`) MUST be accessible only to authenticated admin
  users. All unauthenticated requests to admin routes MUST redirect to the login page.
- **FR-031**: Admins MUST be able to create, read, update, publish, unpublish, and delete any
  politician record or associated data record from the admin panel.
- **FR-032**: Admins MUST be able to review, approve, or reject pending correction submissions.
  All review actions MUST be logged with admin ID and timestamp.
- **FR-033**: Admins MUST be able to view the full scraping log history at `/admin/refresh`,
  including: per-run overall status, per-source scrape status (SUCCESS / PARTIAL / FAILED),
  records scraped per source, error details per source, and total records updated/added per run.
- **FR-034**: Admins MUST be able to manage the approved data source registry at
  `/admin/sources` — adding, editing, and deactivating sources.
- **FR-035**: Admins MUST be able to trigger per-politician score recalculation from
  `/admin/politicians/[id]`. Admins MUST also be able to trigger a full recalculation of
  all politicians' scores from `/admin/scores` — this is the mechanism for a complete
  score refresh outside of the incremental refresh pipeline.
- **FR-036**: Admins MUST be able to configure advertisement zones (ON/OFF per zone) from
  `/admin/ads`.
- **FR-042**: The `DataSource` registry MUST store scraper configuration for each source,
  including: base URL, data type(s) available from that source, reliability tier, active
  status, and a `scope` object specifying `house` (LOK_SABHA | RAJYA_SABHA | null for all)
  and `states` (array of state names to collect; null or empty means all states). Deactivating
  a source MUST exclude it from all scraping runs without requiring code changes.
- **FR-043**: Expanding the Lok Sabha scraping scope to additional states in future versions
  MUST require only a database configuration update (editing `DataSource.scraperConfig.scope.states`)
  — no code changes, no schema migrations, and no redeployment of scraper logic.
- **FR-044**: The admin panel at `/admin/sources` MUST display the active scraping scope for
  each data source, clearly showing: house (Lok Sabha / Rajya Sabha / All) and the list of
  states in scope (or "All States" if unrestricted). This allows admins to verify and audit
  the v1 data coverage at a glance.

**Legal and Disclaimer**

- **FR-037**: A legally robust disclaimer MUST appear prominently in the site footer, on the
  homepage, and on every politician profile page.
- **FR-038**: Dedicated pages MUST exist for: `/legal/disclaimer`, `/legal/privacy`, and
  `/legal/terms`.

**Multi-Country Scalability**

- **FR-039**: All database entities MUST include a `country_code` field. All queries and
  scoring algorithms MUST be parameterized by country code to support future expansion without
  schema changes. Version 1 covers India (`IN`) only.

**Language**

- **FR-040**: Version 1 MUST be in English only. The codebase architecture MUST support future
  i18n expansion (locale-aware routing, externalized strings) without requiring a full rewrite.

**Advertisements**

- **FR-041**: The layout MUST define named ad zones (`header-banner`, `sidebar-top`,
  `sidebar-bottom`, `in-feed`, `profile-mid`). Each zone MUST display a visible "Advertisement"
  label. Ad zones MUST be clearly separated from editorial content and MUST NOT negatively
  affect Core Web Vitals scores.

### Key Entities

- **Politician**: Core identity record. Has many ElectionContests, Tenures, Affiliations,
  Achievements, CorruptionRecords, CrimeRecords, Controversies, AttendanceRecords, Scores.
- **ElectionContest**: One record per election contested. Linked to Politician.
- **ParlamentaryTenure**: One record per parliamentary term served. Linked to Politician.
- **PartyAffiliation**: Full chronological party membership history. Linked to Politician and Party.
- **Party**: Registry of all political parties. Has many affiliated Politicians.
- **Achievement**: A verified positive record tied to a Politician and a time phase.
- **CorruptionRecord**: A verified corruption incident record tied to a Politician.
- **CrimeRecord**: A verified criminal charge record with IPC section, court, and case status.
- **Controversy**: A verified controversy record with severity rating (LOW/MEDIUM/HIGH).
- **AttendanceRecord**: Per-session parliamentary attendance data tied to a Politician.
- **EffectivenessScore**: Versioned computed score (0–100) with full JSON breakdown.
- **CorruptionScore**: Versioned computed score (0–100) with full JSON breakdown.
- **DataSource**: Registry of approved authentic external data sources with reliability tiers
  and scraper configuration. The `scraperConfig.scope` field controls which house and states
  each source collects — the primary mechanism for expanding coverage without code changes.
  v1 sources: ECI (eci.gov.in), Lok Sabha/Tamil Nadu (loksabha.nic.in, scope: Tamil Nadu only),
  Rajya Sabha/All States (rajyasabha.nic.in), PRS (prsindia.org), ADR (adrindia.org).
- **CorrectionSubmission**: User-submitted correction request with admin review workflow.
  Submitter email is admin-visible only and anonymised (hashed) once the correction reaches
  a terminal state (APPROVED or REJECTED), per DPDP Act 2023 data minimisation requirements.
- **RefreshLog**: Audit log of every scraping pipeline run (scheduled, full manual, or
  targeted per-source). Includes overall status and a per-source breakdown with scrape
  status, record counts, and error details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can find any politician within the v1 scope (all Rajya Sabha; Lok Sabha
  Tamil Nadu only) and view their complete sourced profile in under 10 seconds from landing on
  the site. A clearly visible scope notice informs visitors which Lok Sabha states are covered
  in v1 and which are not yet available.
- **SC-002**: 100% of data points visible on public politician profile pages have a clickable
  source link. Zero unsourced data points appear publicly.
- **SC-003**: The site loads on a 4G mobile connection in under 2 seconds for 95% of page
  views (measured by LCP < 2.5s, FID < 100ms, CLS < 0.1).
- **SC-004**: The compare tool renders a side-by-side table for 4 politicians in under 3 seconds.
- **SC-005**: Search returns relevant results for politician name, party, or constituency
  queries in under 2 seconds for 95% of queries.
- **SC-006**: The weekly automated refresh completes without manual intervention and produces
  a complete `RefreshLog` entry for every run.
- **SC-007**: A correction submission takes fewer than 2 minutes for a visitor to complete from
  clicking "Suggest Correction" to receiving a confirmation with a status URL.
- **SC-008**: Zero correction submissions appear on the public site without admin approval.
- **SC-009**: The admin panel is inaccessible to any unauthenticated request — 100% of
  unauthenticated `/admin/*` requests redirect to login.
- **SC-010**: The scoring formula page at `/about` explains the Effectiveness and Corruption
  scoring methodology in plain language, including all weights, so that a non-technical visitor
  can manually verify a politician's score from publicly available data.
- **SC-011**: The site scores ≥ 90 on Google PageSpeed Insights (mobile) after launch.
- **SC-012**: The data model supports adding a second country without any schema migration,
  verified by the presence of `country_code` on all entities.
- **SC-013**: After any scraping run (scheduled or manual), the admin can view a per-source
  breakdown showing which of the five v1 sources succeeded, partially succeeded, or failed —
  with record counts and error detail for each.
- **SC-014**: Expanding the Lok Sabha scraping scope to a new Indian state (e.g. Karnataka)
  is achievable by a database configuration update alone — verified by the absence of any
  state name hardcoded in scraper source files.

## Assumptions

- Politician photos reference official images from government or official party sources — not
  stock photos or AI-generated images.
- The v1 dataset covers approximately 3,000–3,500 unique politician records: ~2,500 from Rajya
  Sabha (all states, since 1952) and ~500–700 from Lok Sabha Tamil Nadu (all Tamil Nadu
  constituencies, since 1952). This is the deliberate v1 scope — not the full national Lok
  Sabha dataset.
- The initial dataset for v1 is loaded by running the full scraping pipeline for the first
  time against ECI, Lok Sabha portal (Tamil Nadu scope only), Rajya Sabha portal, PRS, and
  ADR. There is no separate CSV import or manual bulk entry mechanism — the scraper IS the
  ingestion system, used for both the initial load and all subsequent weekly refreshes.
- All scraped records are flagged `is_verified: false` and held in draft state. Admins review
  and publish records. There is no fully automated publish-without-review path in v1.
- Lok Sabha states other than Tamil Nadu are not in the v1 scraping scope. The site will
  display a clear "Coverage Notice" explaining which states are currently covered and inviting
  users to check back as coverage expands.
- Admin accounts are created by a system administrator directly — there is no public
  self-registration for admin access.
- Email notifications for refresh summaries and correction approvals will use a transactional
  email provider (specific provider is an implementation-time decision).
- The correction submission form will include spam protection (e.g., honeypot and/or CAPTCHA)
  in addition to IP rate limiting.
- Google AdSense will be used for advertising in v1. Ad revenue does not influence editorial
  content, score weights, or data selection in any way.
- Mobile app support is out of scope for v1.
- State assembly election data (Vidhan Sabha) is out of scope for v1 — only Lok Sabha and
  Rajya Sabha elections are covered in the initial launch.
- RTI responses and court documents referenced as sources will be linked to their official
  published locations — ElectaBase does not host copies of these documents in v1.

## Clarifications

### Session 2026-05-08

- Q: How will the initial bulk data (thousands of politician records) be loaded into the system for launch? → A (revised): Automated scraping pipeline — scrapers for ECI, Lok Sabha, Rajya Sabha, PRS, and ADR constitute the data ingestion system. The initial load is the first run of this pipeline. No separate CSV import tool. All scraped records are flagged `is_verified: false` pending admin review.
- Q: How should the correction submitter's email address be treated after submission? → A: Visible to admins only during review; anonymised (one-way hashed) once the correction reaches APPROVED or REJECTED status. Satisfies DPDP Act 2023 data minimisation.
- Q: When the data refresh runs, which politicians' scores should be recalculated? → A: Only politicians whose underlying source data changed in that refresh run. Full recalculation of all politicians is available as a manual admin trigger from `/admin/scores`.
