# Data Model: ElectaBase Platform

**Branch**: `001-electabase-platform` | **Date**: 2026-05-08
**Source**: spec.md entities + research.md decisions

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum ElectionType {
  LOK_SABHA
  RAJYA_SABHA
  STATE
  OTHER
}

enum ElectionResult {
  WON
  LOST
  DISQUALIFIED
}

enum House {
  LOK_SABHA
  RAJYA_SABHA
}

enum RecordPhase {
  BEFORE_TENURE
  DURING_TENURE
  AFTER_TENURE
}

enum AchievementCategory {
  LEGISLATION
  WELFARE
  INFRASTRUCTURE
  AWARD
  INTERNATIONAL
  OTHER
}

enum CorruptionCategory {
  FINANCIAL
  CRIMINAL
  ELECTORAL
  ASSETS
  OTHER
}

enum ControversySeverity {
  LOW
  MEDIUM
  HIGH
}

enum CaseStatus {
  PENDING
  CONVICTED
  ACQUITTED
  APPEALING
}

enum CorrectionStatus {
  PENDING
  APPROVED
  REJECTED
}

enum DataSourceType {
  GOVERNMENT
  JUDICIAL
  JOURNALISTIC
  NGO
  RTI
  OTHER
}

enum RefreshTrigger {
  SCHEDULED
  ADMIN
  TARGETED
}

enum ScrapeStatus {
  SUCCESS
  PARTIAL
  FAILED
}

// ─── Core Entities ────────────────────────────────────────────────────────────

model Politician {
  id                       String    @id @default(cuid())
  countryCode              String    @default("IN") @map("country_code")
  slug                     String    @unique
  fullName                 String    @map("full_name")
  displayName              String    @map("display_name")
  photoUrl                 String?   @map("photo_url")
  photoSourceUrl           String?   @map("photo_source_url")
  dateOfBirth              DateTime? @map("date_of_birth")
  placeOfBirth             String?   @map("place_of_birth")
  gender                   String?
  highestEducation         String?   @map("highest_education")
  educationInstitution     String?   @map("education_institution")
  professionBeforePolitics String?   @map("profession_before_politics")
  currentProfession        String?   @map("current_profession")
  // businesses: [{name: string, role: string, sourceUrl: string}]
  businesses               Json?
  netWorthDeclared         Decimal?  @map("net_worth_declared")
  netWorthSourceUrl        String?   @map("net_worth_source_url")
  currentPartyId           String?   @map("current_party_id")
  isPublished              Boolean   @default(false) @map("is_published")
  isVerified               Boolean   @default(false) @map("is_verified")
  // Computed tsvector for full-text search; maintained via DB trigger
  searchVector             Unsupported("tsvector")? @map("search_vector")
  createdAt                DateTime  @default(now()) @map("created_at")
  updatedAt                DateTime  @updatedAt @map("updated_at")

  currentParty          Party?                 @relation("CurrentParty", fields: [currentPartyId], references: [id])
  electionContests      ElectionContest[]
  parliamentaryTenures  ParlamentaryTenure[]
  partyAffiliations     PartyAffiliation[]
  achievements          Achievement[]
  corruptionRecords     CorruptionRecord[]
  controversies         Controversy[]
  crimeRecords          CrimeRecord[]
  attendanceRecords     AttendanceRecord[]
  effectivenessScores   EffectivenessScore[]
  corruptionScores      CorruptionScore[]
  correctionSubmissions CorrectionSubmission[]

  @@index([countryCode])
  @@index([isPublished])
  @@index([searchVector], type: Gin)
  @@map("politicians")
}

model Party {
  id           String   @id @default(cuid())
  countryCode  String   @default("IN") @map("country_code")
  slug         String   @unique
  name         String
  abbreviation String
  logoUrl      String?  @map("logo_url")
  foundedYear  Int?     @map("founded_year")
  ideologyTags String[] @map("ideology_tags")
  isActive     Boolean  @default(true) @map("is_active")
  sourceUrl    String   @map("source_url")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  currentMembers       Politician[]         @relation("CurrentParty")
  partyAffiliations    PartyAffiliation[]
  parliamentaryTenures ParlamentaryTenure[]

  @@index([countryCode])
  @@map("parties")
}

model ElectionContest {
  id               String         @id @default(cuid())
  politicianId     String         @map("politician_id")
  countryCode      String         @default("IN") @map("country_code")
  electionType     ElectionType   @map("election_type")
  electionYear     Int            @map("election_year")
  constituency     String
  state            String
  result           ElectionResult
  voteCount        Int?           @map("vote_count")
  voteSharePercent Decimal?       @map("vote_share_percent")
  sourceUrl        String         @map("source_url")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId])
  @@index([electionYear])
  @@index([countryCode])
  @@map("election_contests")
}

model ParlamentaryTenure {
  id            String    @id @default(cuid())
  politicianId  String    @map("politician_id")
  countryCode   String    @default("IN") @map("country_code")
  house         House
  constituency  String?
  state         String
  termStartDate DateTime  @map("term_start_date")
  termEndDate   DateTime? @map("term_end_date")
  partyId       String?   @map("party_id")
  sourceUrl     String    @map("source_url")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)
  party      Party?     @relation(fields: [partyId], references: [id])

  @@index([politicianId])
  @@index([countryCode])
  @@map("parliamentary_tenures")
}

model PartyAffiliation {
  id           String    @id @default(cuid())
  politicianId String    @map("politician_id")
  partyId      String    @map("party_id")
  startDate    DateTime  @map("start_date")
  endDate      DateTime? @map("end_date")
  roleInParty  String?   @map("role_in_party")
  sourceUrl    String    @map("source_url")
  createdAt    DateTime  @default(now()) @map("created_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)
  party      Party      @relation(fields: [partyId], references: [id])

  @@index([politicianId])
  @@index([partyId])
  @@map("party_affiliations")
}

model Achievement {
  id           String              @id @default(cuid())
  politicianId String              @map("politician_id")
  countryCode  String              @default("IN") @map("country_code")
  title        String
  description  String
  phase        RecordPhase
  category     AchievementCategory
  date         DateTime?
  sourceUrl    String              @map("source_url")
  isVerified   Boolean             @default(false) @map("is_verified")
  createdAt    DateTime            @default(now()) @map("created_at")
  updatedAt    DateTime            @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId])
  @@index([countryCode])
  @@map("achievements")
}

model CorruptionRecord {
  id              String             @id @default(cuid())
  politicianId    String             @map("politician_id")
  countryCode     String             @default("IN") @map("country_code")
  title           String
  description     String
  phase           RecordPhase
  category        CorruptionCategory
  date            DateTime?
  courtCaseNumber String?            @map("court_case_number")
  caseStatus      CaseStatus?        @map("case_status")
  jailTimeDays    Int?               @map("jail_time_days")
  sourceUrl       String             @map("source_url")
  isVerified      Boolean            @default(false) @map("is_verified")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId])
  @@index([countryCode])
  @@map("corruption_records")
}

model Controversy {
  id               String              @id @default(cuid())
  politicianId     String              @map("politician_id")
  countryCode      String              @default("IN") @map("country_code")
  title            String
  description      String
  date             DateTime?
  category         String
  severity         ControversySeverity
  resolutionStatus String?             @map("resolution_status")
  sourceUrl        String              @map("source_url")
  isVerified       Boolean             @default(false) @map("is_verified")
  createdAt        DateTime            @default(now()) @map("created_at")
  updatedAt        DateTime            @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId])
  @@index([countryCode])
  @@map("controversies")
}

model CrimeRecord {
  id                String     @id @default(cuid())
  politicianId      String     @map("politician_id")
  countryCode       String     @default("IN") @map("country_code")
  chargeDescription String     @map("charge_description")
  ipcSection        String?    @map("ipc_section")
  // 1=SEVERE, 2=SERIOUS, 3=MODERATE, 4=MINOR — drives corruption score multiplier
  ipcSeverityTier   Int?       @map("ipc_severity_tier")
  courtName         String?    @map("court_name")
  caseStatus        CaseStatus @map("case_status")
  verdictDate       DateTime?  @map("verdict_date")
  jailTimeDays      Int?       @map("jail_time_days")
  sourceUrl         String     @map("source_url")
  isVerified        Boolean    @default(false) @map("is_verified")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId])
  @@index([countryCode])
  @@map("crime_records")
}

model AttendanceRecord {
  id                     String   @id @default(cuid())
  politicianId           String   @map("politician_id")
  house                  House
  sessionName            String   @map("session_name")
  year                   Int
  totalSessions          Int      @map("total_sessions")
  sessionsAttended       Int      @map("sessions_attended")
  attendancePercentage   Decimal  @map("attendance_percentage")
  questionsRaised        Int      @default(0) @map("questions_raised")
  billsParticipated      Int      @default(0) @map("bills_participated")
  debatesParticipated    Int      @default(0) @map("debates_participated")
  privateBillsIntroduced Int      @default(0) @map("private_bills_introduced")
  sourceUrl              String   @map("source_url")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@unique([politicianId, house, sessionName, year])
  @@index([politicianId])
  @@map("attendance_records")
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

model EffectivenessScore {
  id               String   @id @default(cuid())
  politicianId     String   @map("politician_id")
  countryCode      String   @default("IN") @map("country_code")
  score            Decimal  // 0.00–100.00
  rankNational     Int?     @map("rank_national")
  rankParty        Int?     @map("rank_party")
  rankState        Int?     @map("rank_state")
  algorithmVersion String   @map("algorithm_version") // e.g. "effectiveness-v1.0"
  // Breakdown example: {"attendance":18.5,"questions":12.3,"debates":9.1,...}
  scoreBreakdown   Json     @map("score_breakdown")
  computedAt       DateTime @default(now()) @map("computed_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId, computedAt])
  @@index([countryCode, score])
  @@map("effectiveness_scores")
}

model CorruptionScore {
  id               String   @id @default(cuid())
  politicianId     String   @map("politician_id")
  countryCode      String   @default("IN") @map("country_code")
  score            Decimal  // 0.00–100.00
  rankNational     Int?     @map("rank_national")
  rankParty        Int?     @map("rank_party")
  rankState        Int?     @map("rank_state")
  algorithmVersion String   @map("algorithm_version") // e.g. "corruption-v1.0"
  // Breakdown example: {"criminalCases":24.0,"convictions":15.0,"jailTime":8.5,...}
  scoreBreakdown   Json     @map("score_breakdown")
  computedAt       DateTime @default(now()) @map("computed_at")

  politician Politician @relation(fields: [politicianId], references: [id], onDelete: Cascade)

  @@index([politicianId, computedAt])
  @@index([countryCode, score])
  @@map("corruption_scores")
}

// ─── Data Pipeline ────────────────────────────────────────────────────────────

model DataSource {
  id              String         @id @default(cuid())
  countryCode     String         @default("IN") @map("country_code")
  name            String
  url             String
  type            DataSourceType
  reliabilityTier Int            @map("reliability_tier") // 1=highest, 3=lowest
  // Scraper config: {urlPatterns: string[], dataTypes: string[], notes: string}
  scraperConfig   Json?          @map("scraper_config")
  isActive        Boolean        @default(true) @map("is_active")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  sourceResults RefreshLogSource[]

  @@index([countryCode])
  @@map("data_sources")
}

model RefreshLog {
  id             String         @id @default(cuid())
  triggeredBy    RefreshTrigger @map("triggered_by")
  triggeredAt    DateTime       @default(now()) @map("triggered_at")
  completedAt    DateTime?      @map("completed_at")
  status         ScrapeStatus
  recordsUpdated Int            @default(0) @map("records_updated")
  recordsAdded   Int            @default(0) @map("records_added")
  adminId        String?        @map("admin_id")
  targetSourceId String?        @map("target_source_id") // set for TARGETED runs

  sourceResults RefreshLogSource[]

  @@map("refresh_logs")
}

model RefreshLogSource {
  id             String       @id @default(cuid())
  refreshLogId   String       @map("refresh_log_id")
  dataSourceId   String       @map("data_source_id")
  status         ScrapeStatus
  recordsScraped Int          @default(0) @map("records_scraped")
  errorDetail    String?      @map("error_detail")
  durationMs     Int?         @map("duration_ms")

  refreshLog RefreshLog @relation(fields: [refreshLogId], references: [id], onDelete: Cascade)
  dataSource DataSource @relation(fields: [dataSourceId], references: [id])

  @@map("refresh_log_sources")
}

// ─── Corrections ──────────────────────────────────────────────────────────────

model CorrectionSubmission {
  id               String           @id @default(cuid())
  politicianId     String           @map("politician_id")
  // Nulled after anonymisation (terminal state reached)
  submittedByEmail String?          @map("submitted_by_email")
  // One-way SHA-256 hash retained for audit after anonymisation
  emailHash        String?          @map("email_hash")
  fieldInQuestion  String           @map("field_in_question")
  currentValue     String           @map("current_value")
  suggestedValue   String           @map("suggested_value")
  reason           String
  evidenceUrl      String?          @map("evidence_url")
  status           CorrectionStatus @default(PENDING)
  reviewedByAdminId String?         @map("reviewed_by_admin_id")
  reviewedAt       DateTime?        @map("reviewed_at")
  reviewNote       String?          @map("review_note")
  createdAt        DateTime         @default(now()) @map("created_at")

  politician Politician @relation(fields: [politicianId], references: [id])

  @@index([politicianId])
  @@index([status])
  @@map("correction_submissions")
}

// ─── Ad Zone Configuration ────────────────────────────────────────────────────

model AdZone {
  id        String   @id @default(cuid())
  zoneKey   String   @unique @map("zone_key") // e.g. "header-banner"
  isEnabled Boolean  @default(true) @map("is_enabled")
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy String?  @map("updated_by")

  @@map("ad_zones")
}
```

---

## Entity Relationships

```
Politician ──< ElectionContest
Politician ──< ParlamentaryTenure >── Party
Politician ──< PartyAffiliation >── Party
Politician >── Party (currentParty)
Politician ──< Achievement
Politician ──< CorruptionRecord
Politician ──< Controversy
Politician ──< CrimeRecord
Politician ──< AttendanceRecord
Politician ──< EffectivenessScore
Politician ──< CorruptionScore
Politician ──< CorrectionSubmission
DataSource ──< RefreshLogSource >── RefreshLog
```

---

## Key Design Decisions

### Slug Uniqueness
Slug format: `{sanitized-name}-{birth-year}` (e.g. `narendra-modi-1950`).
Collision (same name + year): append `-{n}` suffix (`narendra-modi-1950-2`).
Birth year unknown: `{name}-{cuid-6chars}`.
Slugs are immutable once created.

### Score Versioning
`EffectivenessScore` and `CorruptionScore` are append-only. A new row is inserted on each
recalculation. The latest row (ordered by `computedAt DESC`) is the current score.
Historical scores are preserved by `algorithmVersion` and `computedAt`.

### `is_verified` vs `is_published`
- `is_verified`: admin has reviewed and confirmed the record is accurate.
- `is_published`: record is visible on the public site.
- A record MUST be both `is_verified: true` AND `is_published: true` to appear publicly.
- Scraped records start as `is_verified: false, is_published: false`.

### Full-Text Search Trigger
A PostgreSQL trigger maintains `search_vector` on `politicians`:
```sql
CREATE OR REPLACE FUNCTION update_politician_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', coalesce(NEW.full_name, '')) ||
    to_tsvector('english', coalesce(NEW.display_name, '')) ||
    to_tsvector('english', coalesce(NEW.place_of_birth, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER politician_search_vector_update
BEFORE INSERT OR UPDATE ON politicians
FOR EACH ROW EXECUTE FUNCTION update_politician_search_vector();
```
Party name and constituency are joined at query time via the `politicians_search` view.

### Email Anonymisation Lifecycle
```
CorrectionSubmission created → submitted_by_email = "user@example.com", email_hash = null
Admin approves/rejects      → email_hash = SHA256("user@example.com"), submitted_by_email = null
```
A scheduled cleanup job (or trigger) runs after status changes to terminal state.

### `country_code` Parameterization
All scoring queries filter by `countryCode`. Scoring weight configs are stored in a
`ScoringConfig` table (future) keyed by `country_code + algorithm_version`, enabling
different weight sets per country without code changes.
