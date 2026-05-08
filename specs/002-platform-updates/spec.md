# Feature Specification: ElectaBase — Platform Updates (Family Links, News Sources, Ads Removal, Mobile)

**Feature Branch**: `002-platform-updates`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Platform updates: family links, approved news sources, remove ads, mobile responsiveness"
**Amends**: `specs/001-electabase-platform/spec.md`

---

> **Note**: This specification amends `001-electabase-platform`. Requirements in this document
> override or extend any conflicting requirements in the original spec. All other requirements
> from `001-electabase-platform` remain in force unless explicitly superseded here.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visitor Discovers a Politician's Family Connections (Priority: P1)

A voter reading a politician's profile notices the "Family in Politics" section and discovers
that this MP is the child of a former Chief Minister and the sibling of a sitting Rajya Sabha
member. They click through to each related politician's profile to compare their scores and
records side-by-side.

**Why this priority**: Family political dynasties are a significant transparency concern for
Indian civic research. This feature adds high public-interest value with minimal scope risk.
It enhances the core politician profile — the platform's highest-traffic page — without
requiring new navigation or UI patterns.

**Independent Test**: A politician record with at least one `PoliticianRelationship` entry
renders a "Family in Politics" section on their profile page at `/politicians/[slug]`. Each
linked relative shows their photo (or placeholder), full name, current party, and latest
Effectiveness and Corruption scores. Each relative's name is a clickable link to their profile.

**Acceptance Scenarios**:

1. **Given** a politician has one or more family relationships recorded, **When** a visitor
   views their profile at `/politicians/[slug]`, **Then** a "Family in Politics" section
   appears below their biographical details showing each related politician with: name,
   relationship label (e.g. "Daughter", "Spouse"), party affiliation, Effectiveness Score,
   and Corruption Score — each item with a source badge.
2. **Given** a politician has no family relationships recorded, **When** a visitor views
   their profile, **Then** the "Family in Politics" section does NOT appear — it is not
   rendered as empty or as "None on record".
3. **Given** a family relationship is recorded between Politician A and Politician B,
   **When** a visitor views Politician B's profile, **Then** Politician A also appears in
   Politician B's "Family in Politics" section — the relationship is bidirectional.
4. **Given** a relative's profile is unpublished, **When** a visitor views the family
   section, **Then** the unpublished relative is NOT shown — only published politicians
   are visible.
5. **Given** an admin records a family relationship, **When** the source URL is omitted,
   **Then** the system rejects the submission — a source URL is mandatory for every
   relationship record.

---

### User Story 2 — Admin Cites a Newspaper Article as a Source (Priority: P2)

An admin adding a crime record for a politician enters a URL from `timesofindia.com` as the
source link. The system accepts it, the source badge appears on the public profile, and the
source domain is visible in the `DataSource` registry as an approved journalistic source.

**Why this priority**: Expanding the approved source list to India's three most-read
English-language newspapers significantly increases the quantity and quality of verifiable
records admins can cite. It strengthens platform credibility without relaxing source quality
controls.

**Independent Test**: The `DataSource` registry contains active entries for
`timesofindia.com`, `thehindu.com`, and `indianexpress.com`. An admin can attach a URL from
any of these three domains as a source URL for any politician data record. The scraper
pipeline only fetches from sources listed in the active `DataSource` registry.

**Acceptance Scenarios**:

1. **Given** The Times of India, The Hindu, and The Indian Express are in the active
   `DataSource` registry, **When** an admin creates a crime or controversy record citing
   a URL from one of these domains, **Then** the record is accepted and published with a
   working source badge.
2. **Given** an admin enters a URL from a domain NOT in the approved `DataSource` registry
   as a source for a record, **When** they attempt to publish, **Then** the system shows an
   advisory warning that the source domain is unrecognised. The admin may proceed after
   acknowledging the warning — this is advisory, not a hard block.
3. **Given** the scraper pipeline runs, **When** it collects data, **Then** it MUST only
   make HTTP requests to domains listed as active entries in the `DataSource` registry.
   Any attempt to fetch from an unlisted domain MUST be blocked and logged as a constraint
   violation error.

---

### User Story 3 — Visitor Uses the Site on a Mobile Phone (Priority: P1)

A voter checking candidate information on a 4G smartphone (320px–428px screen) reads a
politician's profile, browses the politician list, and uses search and filters — without
horizontal scrolling, tiny text, or broken layouts.

**Why this priority**: A large proportion of Indian internet users access the web exclusively
on mobile. A site unusable on mobile fails its core civic mission. This is P1 because it
affects every existing feature.

**Independent Test**: All public pages render correctly on screen widths from 320px to 428px.
The navigation collapses to a hamburger menu. Data tables scroll horizontally inside their
container rather than breaking the page layout. Text is legible at default zoom. Touch targets
meet the 44×44px minimum size.

**Acceptance Scenarios**:

1. **Given** a visitor opens the site on a 320px-wide screen, **When** they view any page,
   **Then** no content is clipped and the page itself does not scroll horizontally. Only
   data tables inside the content area may scroll horizontally within their container.
2. **Given** a visitor is on a screen narrower than 768px, **When** the page loads,
   **Then** a hamburger icon is visible in the header. **When** they tap it, the full
   navigation menu opens (Politicians, Parties, Leaderboards, Compare, About, Admin).
3. **Given** a visitor views a politician's profile on mobile with a multi-column data table
   (e.g. election history, attendance), **When** the table is wider than the viewport,
   **Then** the table scrolls horizontally within its container — the page layout is not
   broken.
4. **Given** a visitor uses the Compare tool on mobile with 3–4 politicians selected, **When**
   the comparison table renders, **Then** the user can swipe left/right on the table to see
   all columns.
5. **Given** a visitor is on a 1024px+ desktop screen, **When** they view any page, **Then**
   the full horizontal navigation is visible and the hamburger menu is absent.

---

### User Story 4 — Admin Manages Family Relationships (Priority: P2)

An admin editing Kanimozhi Karunanidhi's record links her as the "Child" of M. Karunanidhi
and "Sibling" of M. K. Stalin. Each link has a source URL. Both relationships appear
immediately on all three politicians' profiles bidirectionally.

**Why this priority**: Without admin tooling to create relationships, no family data can
enter the platform. This is the supply-side counterpart to User Story 1.

**Independent Test**: An authenticated admin can create a `PoliticianRelationship` record
from the admin panel, specify both politicians, relationship type, description, and source URL.
The relationship appears bidirectionally on both published politicians' profiles.

**Acceptance Scenarios**:

1. **Given** an admin is on a politician's edit page, **When** they add a family relationship
   with related politician, type, description, and source URL and save, **Then** the
   relationship is immediately visible on both politicians' published profiles.
2. **Given** an admin tries to save a relationship without a source URL, **Then** the save
   is rejected with a validation error requiring a source URL.
3. **Given** an admin saves a PARENT relationship (A → B), **Then** B→A (CHILD) is
   automatically queryable without the admin creating a second record. SPOUSE and SIBLING
   relationships work the same way.
4. **Given** an admin deletes a relationship, **When** a visitor views either politician's
   profile, **Then** that relationship no longer appears in the "Family in Politics" section.

---

### Edge Cases

- What happens if an admin tries to link a politician to themselves?
  → The system MUST reject self-referential relationships at the validation layer.
- What happens when the related politician is not yet in the database?
  → Relationships cannot be created until both politicians have records. The admin must add
  the second politician first.
- What if the relationship type is ambiguous (e.g. father-in-law)?
  → Use `OTHER` with a descriptive `description` field (e.g. "Father-in-law").
- What happens if a newspaper article URL used as a source is later deleted (link rot)?
  → The URL remains stored. The platform does not re-validate source URLs after the initial
  save. Admins can update the URL if they detect link rot.
- What happens on 375px when a politician has 6 family members?
  → Family member cards stack vertically. No horizontal scrolling is needed for the family
  section itself.
- What breakpoint governs the switch between hamburger and full desktop nav?
  → Below 768px: hamburger. At 768px and above: full horizontal nav. No separate tablet
  breakpoint is required.

---

## Requirements *(mandatory)*

### Functional Requirements

**Family Links (New)**

- **FR-045**: The system MUST support a `PoliticianRelationship` entity linking two politicians
  with: `politician_id`, `related_politician_id`, `relationship_type`
  (SPOUSE | PARENT | CHILD | SIBLING | OTHER), `description` (optional free text), and
  `source_url` (mandatory). A unique constraint MUST exist on
  `(politician_id, related_politician_id, relationship_type)`.
- **FR-046**: Every `PoliticianRelationship` record MUST have a non-empty `source_url`. The
  system MUST reject saves where `source_url` is absent or blank.
- **FR-047**: SPOUSE, SIBLING, and PARENT/CHILD relationships MUST be bidirectional: saving
  A→B (PARENT) makes B→A (CHILD) queryable; saving A→B (SPOUSE) makes B→A (SPOUSE)
  queryable. Bidirectionality MUST be enforced consistently — either via a single-row
  approach (querying both directions in SQL) or by automatically creating the inverse row.
  In either case, deleting one direction MUST automatically remove the other.
- **FR-048**: The public politician profile page MUST display a "Family in Politics" section
  when at least one published `PoliticianRelationship` exists for that politician. The section
  MUST show for each relative: name, relationship label, photo (or placeholder), current party
  abbreviation, latest Effectiveness Score, latest Corruption Score, and a source badge.
- **FR-049**: Relatives whose `isPublished` flag is `false` MUST NOT appear in any public
  "Family in Politics" section.
- **FR-050**: Admins MUST be able to create, edit, and delete `PoliticianRelationship` records
  from the politician edit page at `/admin/politicians/[id]`.
- **FR-051**: The system MUST reject any relationship where `politician_id` equals
  `related_politician_id`.

**Approved News Sources (Amendment to FR-026)**

- **FR-026** *(amended)*: The approved `DataSource` registry MUST be seeded with all of the
  following sources. Government portals: Election Commission of India (eci.gov.in), Lok Sabha
  (loksabha.nic.in), Rajya Sabha (rajyasabha.nic.in). Civic organisations: PRS Legislative
  Research (prsindia.org), ADR — Association for Democratic Reforms (adrindia.org).
  News media (new): The Times of India (timesofindia.com), The Hindu (thehindu.com),
  The Indian Express (indianexpress.com). All eight sources MUST be present in the
  `DataSource` table. Government/civic sources carry `type: GOVERNMENT` or `type: NGO`.
  News media sources carry `type: JOURNALISTIC` and `reliability_tier: 2`.
- **FR-052**: The scraper pipeline MUST enforce that it only makes outbound HTTP requests to
  domains listed as active entries in the `DataSource` registry. Any unlisted domain MUST
  be blocked and logged as a constraint violation in the `RefreshLog`.
- **FR-053**: When an admin enters a source URL whose domain does not match any active
  `DataSource` entry, the admin UI MUST display an advisory warning. The admin may
  acknowledge and proceed — this is advisory guidance, not a hard validation block.

**Advertisements Removed (Supersedes FR-036 and FR-041)**

- **FR-036** *(removed)*: The `/admin/ads` page and all advertisement zone management is
  REMOVED from v1 scope.
- **FR-041** *(removed)*: All named ad zones (`header-banner`, `sidebar-top`, etc.), the
  Google AdSense integration, and all ad zone UI components are REMOVED from v1.
- **FR-054**: Any `AdZone` database table MUST be dropped if it exists. All ad zone UI
  components, layout slots, and admin panel navigation links referencing `/admin/ads`
  MUST be removed from the codebase.

**Mobile Responsiveness (New)**

- **FR-055**: All public-facing pages MUST be fully responsive at screen widths from 320px
  to 1440px+. No page content MAY be clipped, overflow, or require horizontal page scrolling
  at these widths: 320px, 375px, 390px, 428px, 768px, 1024px, 1280px.
- **FR-056**: The site header MUST display a hamburger icon on viewports narrower than 768px.
  Tapping it MUST toggle a menu showing all navigation links. At ≥768px, the full horizontal
  nav MUST be shown and the hamburger MUST NOT be present.
- **FR-057**: All HTML data tables MUST be wrapped in a horizontally scrollable container on
  mobile. The table container scrolls; the page itself MUST NOT scroll horizontally.
- **FR-058**: All interactive touch targets (buttons, links, form controls) MUST be at least
  44×44 CSS pixels on mobile breakpoints (WCAG 2.1 SC 2.5.5).
- **FR-059**: Body text MUST be at minimum 14px. Form input text MUST be at minimum 16px
  to prevent automatic viewport zooming on iOS devices.

### Key Entities

- **PoliticianRelationship** *(new)*: Links two politicians by a verified family bond.
  Fields: `id`, `politician_id` (FK → Politician), `related_politician_id` (FK → Politician),
  `relationship_type` (SPOUSE | PARENT | CHILD | SIBLING | OTHER), `description`
  (optional), `source_url` (mandatory), `country_code`, `created_at`, `updated_at`.
  Constraints: unique on `(politician_id, related_politician_id, relationship_type)`;
  check that `politician_id ≠ related_politician_id`.
- **DataSource** *(extended)*: Three new seed rows — The Times of India, The Hindu,
  The Indian Express — each with `type: JOURNALISTIC` and `reliability_tier: 2`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-015**: 100% of visible `PoliticianRelationship` records on public profile pages have
  a source badge with a working URL. Zero relationship records appear without a source.
- **SC-016**: The "Family in Politics" section renders within the same page load as the rest
  of the politician profile — no separate network request is required.
- **SC-017**: All three new news media sources (Times of India, The Hindu, Indian Express)
  are present in the active `DataSource` registry after the data migration runs.
- **SC-018**: All eight approved data sources are listed on `/admin/sources` after
  implementation.
- **SC-019**: Zero ad zone tables, components, or UI references remain in the codebase or
  database schema after implementation.
- **SC-020**: All public pages render without horizontal page overflow on a 375px-wide
  viewport. Verification: `document.body.scrollWidth ≤ window.innerWidth` returns `true`
  on every public route at 375px.
- **SC-021**: The hamburger navigation menu functions on a 375px viewport — tapping opens
  all navigation links. On a 1024px viewport, the hamburger is absent and the full
  horizontal nav is displayed.
- **SC-022**: No page regression — all 10 public routes and `/admin/login` continue to
  return HTTP 200 after all changes are applied.

## Assumptions

- Bidirectionality of family relationships is enforced at query time using a SQL union of
  both directions. This avoids orphaned rows when a record is deleted and is the preferred
  approach over storing two separate rows.
- The three news media sources are reference sources for admin-entered URLs only. Automated
  scraping of newspaper websites is NOT in scope for v1 — only the government and civic
  sources (ECI, Lok Sabha, Rajya Sabha, PRS, ADR) are scraped by the weekly pipeline.
- The advisory domain warning for admin-entered source URLs is a soft guide to help maintain
  data quality. Admins retain editorial discretion to cite primary documents (e.g. court
  orders, RTI responses) from any URL domain.
- Mobile responsiveness is achieved via CSS breakpoints (mobile-first) using the existing
  Tailwind CSS framework. No separate mobile app or PWA is needed.
- The hamburger menu is a new component added to the existing `Header` — no routing or layout
  restructuring is required.
- The screen width threshold for the hamburger/desktop nav switch is 768px.
- If the `AdZone` table was never created in the database, no migration drop is needed.
  If it was previously created, it must be dropped before this spec is considered complete.
- The `PoliticianRelationship` entity requires a new Prisma schema model and a database
  migration. The migration is a non-destructive `CREATE TABLE` operation.
