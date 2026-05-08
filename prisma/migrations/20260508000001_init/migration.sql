-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('LOK_SABHA', 'RAJYA_SABHA', 'STATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ElectionResult" AS ENUM ('WON', 'LOST', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "House" AS ENUM ('LOK_SABHA', 'RAJYA_SABHA');

-- CreateEnum
CREATE TYPE "RecordPhase" AS ENUM ('BEFORE_TENURE', 'DURING_TENURE', 'AFTER_TENURE');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('LEGISLATION', 'WELFARE', 'INFRASTRUCTURE', 'AWARD', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CorruptionCategory" AS ENUM ('FINANCIAL', 'CRIMINAL', 'ELECTORAL', 'ASSETS', 'OTHER');

-- CreateEnum
CREATE TYPE "ControversySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('PENDING', 'CONVICTED', 'ACQUITTED', 'APPEALING');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('GOVERNMENT', 'JUDICIAL', 'JOURNALISTIC', 'NGO', 'RTI', 'OTHER');

-- CreateEnum
CREATE TYPE "RefreshTrigger" AS ENUM ('SCHEDULED', 'ADMIN', 'TARGETED');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "politicians" (
    "id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "slug" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "photo_source_url" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "place_of_birth" TEXT,
    "gender" TEXT,
    "highest_education" TEXT,
    "education_institution" TEXT,
    "profession_before_politics" TEXT,
    "current_profession" TEXT,
    "businesses" JSONB,
    "net_worth_declared" DECIMAL(65,30),
    "net_worth_source_url" TEXT,
    "current_party_id" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "logo_url" TEXT,
    "founded_year" INTEGER,
    "ideology_tags" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_contests" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "election_type" "ElectionType" NOT NULL,
    "election_year" INTEGER NOT NULL,
    "constituency" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "result" "ElectionResult" NOT NULL,
    "vote_count" INTEGER,
    "vote_share_percent" DECIMAL(65,30),
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parliamentary_tenures" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "house" "House" NOT NULL,
    "constituency" TEXT,
    "state" TEXT NOT NULL,
    "term_start_date" TIMESTAMP(3) NOT NULL,
    "term_end_date" TIMESTAMP(3),
    "party_id" TEXT,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parliamentary_tenures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_affiliations" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "role_in_party" TEXT,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" "RecordPhase" NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "date" TIMESTAMP(3),
    "source_url" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corruption_records" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" "RecordPhase" NOT NULL,
    "category" "CorruptionCategory" NOT NULL,
    "date" TIMESTAMP(3),
    "court_case_number" TEXT,
    "case_status" "CaseStatus",
    "jail_time_days" INTEGER,
    "source_url" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corruption_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controversies" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "severity" "ControversySeverity" NOT NULL,
    "resolution_status" TEXT,
    "source_url" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controversies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crime_records" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "charge_description" TEXT NOT NULL,
    "ipc_section" TEXT,
    "ipc_severity_tier" INTEGER,
    "court_name" TEXT,
    "case_status" "CaseStatus" NOT NULL,
    "verdict_date" TIMESTAMP(3),
    "jail_time_days" INTEGER,
    "source_url" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crime_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "house" "House" NOT NULL,
    "session_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "sessions_attended" INTEGER NOT NULL,
    "attendance_percentage" DECIMAL(65,30) NOT NULL,
    "questions_raised" INTEGER NOT NULL DEFAULT 0,
    "bills_participated" INTEGER NOT NULL DEFAULT 0,
    "debates_participated" INTEGER NOT NULL DEFAULT 0,
    "private_bills_introduced" INTEGER NOT NULL DEFAULT 0,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effectiveness_scores" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "score" DECIMAL(65,30) NOT NULL,
    "rank_national" INTEGER,
    "rank_party" INTEGER,
    "rank_state" INTEGER,
    "algorithm_version" TEXT NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "effectiveness_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corruption_scores" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "score" DECIMAL(65,30) NOT NULL,
    "rank_national" INTEGER,
    "rank_party" INTEGER,
    "rank_state" INTEGER,
    "algorithm_version" TEXT NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corruption_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "reliability_tier" INTEGER NOT NULL,
    "scraper_config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_logs" (
    "id" TEXT NOT NULL,
    "triggered_by" "RefreshTrigger" NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "ScrapeStatus" NOT NULL,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "records_added" INTEGER NOT NULL DEFAULT 0,
    "admin_id" TEXT,
    "target_source_id" TEXT,

    CONSTRAINT "refresh_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_log_sources" (
    "id" TEXT NOT NULL,
    "refresh_log_id" TEXT NOT NULL,
    "data_source_id" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "records_scraped" INTEGER NOT NULL DEFAULT 0,
    "error_detail" TEXT,
    "duration_ms" INTEGER,

    CONSTRAINT "refresh_log_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_submissions" (
    "id" TEXT NOT NULL,
    "politician_id" TEXT NOT NULL,
    "submitted_by_email" TEXT,
    "email_hash" TEXT,
    "field_in_question" TEXT NOT NULL,
    "current_value" TEXT NOT NULL,
    "suggested_value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_url" TEXT,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correction_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_zones" (
    "id" TEXT NOT NULL,
    "zone_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ad_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "politicians_slug_key" ON "politicians"("slug");

-- CreateIndex
CREATE INDEX "politicians_country_code_idx" ON "politicians"("country_code");

-- CreateIndex
CREATE INDEX "politicians_is_published_idx" ON "politicians"("is_published");

-- CreateIndex
CREATE INDEX "politicians_search_vector_idx" ON "politicians" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "parties_slug_key" ON "parties"("slug");

-- CreateIndex
CREATE INDEX "parties_country_code_idx" ON "parties"("country_code");

-- CreateIndex
CREATE INDEX "election_contests_politician_id_idx" ON "election_contests"("politician_id");

-- CreateIndex
CREATE INDEX "election_contests_election_year_idx" ON "election_contests"("election_year");

-- CreateIndex
CREATE INDEX "election_contests_country_code_idx" ON "election_contests"("country_code");

-- CreateIndex
CREATE INDEX "parliamentary_tenures_politician_id_idx" ON "parliamentary_tenures"("politician_id");

-- CreateIndex
CREATE INDEX "parliamentary_tenures_country_code_idx" ON "parliamentary_tenures"("country_code");

-- CreateIndex
CREATE INDEX "party_affiliations_politician_id_idx" ON "party_affiliations"("politician_id");

-- CreateIndex
CREATE INDEX "party_affiliations_party_id_idx" ON "party_affiliations"("party_id");

-- CreateIndex
CREATE INDEX "achievements_politician_id_idx" ON "achievements"("politician_id");

-- CreateIndex
CREATE INDEX "achievements_country_code_idx" ON "achievements"("country_code");

-- CreateIndex
CREATE INDEX "corruption_records_politician_id_idx" ON "corruption_records"("politician_id");

-- CreateIndex
CREATE INDEX "corruption_records_country_code_idx" ON "corruption_records"("country_code");

-- CreateIndex
CREATE INDEX "controversies_politician_id_idx" ON "controversies"("politician_id");

-- CreateIndex
CREATE INDEX "controversies_country_code_idx" ON "controversies"("country_code");

-- CreateIndex
CREATE INDEX "crime_records_politician_id_idx" ON "crime_records"("politician_id");

-- CreateIndex
CREATE INDEX "crime_records_country_code_idx" ON "crime_records"("country_code");

-- CreateIndex
CREATE INDEX "attendance_records_politician_id_idx" ON "attendance_records"("politician_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_politician_id_house_session_name_year_key" ON "attendance_records"("politician_id", "house", "session_name", "year");

-- CreateIndex
CREATE INDEX "effectiveness_scores_politician_id_computed_at_idx" ON "effectiveness_scores"("politician_id", "computed_at");

-- CreateIndex
CREATE INDEX "effectiveness_scores_country_code_score_idx" ON "effectiveness_scores"("country_code", "score");

-- CreateIndex
CREATE INDEX "corruption_scores_politician_id_computed_at_idx" ON "corruption_scores"("politician_id", "computed_at");

-- CreateIndex
CREATE INDEX "corruption_scores_country_code_score_idx" ON "corruption_scores"("country_code", "score");

-- CreateIndex
CREATE INDEX "data_sources_country_code_idx" ON "data_sources"("country_code");

-- CreateIndex
CREATE INDEX "correction_submissions_politician_id_idx" ON "correction_submissions"("politician_id");

-- CreateIndex
CREATE INDEX "correction_submissions_status_idx" ON "correction_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ad_zones_zone_key_key" ON "ad_zones"("zone_key");

-- AddForeignKey
ALTER TABLE "politicians" ADD CONSTRAINT "politicians_current_party_id_fkey" FOREIGN KEY ("current_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_contests" ADD CONSTRAINT "election_contests_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parliamentary_tenures" ADD CONSTRAINT "parliamentary_tenures_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parliamentary_tenures" ADD CONSTRAINT "parliamentary_tenures_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_affiliations" ADD CONSTRAINT "party_affiliations_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_affiliations" ADD CONSTRAINT "party_affiliations_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corruption_records" ADD CONSTRAINT "corruption_records_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controversies" ADD CONSTRAINT "controversies_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crime_records" ADD CONSTRAINT "crime_records_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effectiveness_scores" ADD CONSTRAINT "effectiveness_scores_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corruption_scores" ADD CONSTRAINT "corruption_scores_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_log_sources" ADD CONSTRAINT "refresh_log_sources_refresh_log_id_fkey" FOREIGN KEY ("refresh_log_id") REFERENCES "refresh_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_log_sources" ADD CONSTRAINT "refresh_log_sources_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_submissions" ADD CONSTRAINT "correction_submissions_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Full-text search trigger on politicians
-- Maintains search_vector from full_name || display_name || place_of_birth
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
