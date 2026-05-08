# Quickstart: ElectaBase Development Setup

**Branch**: `001-electabase-platform` | **Date**: 2026-05-08

---

## Prerequisites

- Node.js 20+ (LTS)
- pnpm 9+ (`npm install -g pnpm`)
- Git
- A Supabase account (free tier) — supabase.com
- An Upstash account (free tier) — upstash.com

---

## 1. Clone and Install

```bash
git clone <repo-url> electabase
cd electabase
pnpm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
```env
# Supabase
DATABASE_URL=postgresql://...           # Supabase connection string (pooler)
DIRECT_URL=postgresql://...            # Supabase direct connection (for migrations)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # Admin-only operations

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Resend (email)
RESEND_API_KEY=re_...
ADMIN_EMAIL=admin@yourdomain.com       # Refresh notification recipient

# Pipeline auth (GitHub Actions webhook secret)
PIPELINE_SECRET=...                    # Long random string — set same in GitHub Secrets

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Database Setup

```bash
# Apply Prisma schema to your Supabase database
pnpm prisma migrate dev --name init

# Seed the DataSource registry with the 5 v1 sources
pnpm prisma db seed

# Generate Prisma client
pnpm prisma generate
```

The seed script (`prisma/seed.ts`) creates:
- 5 `DataSource` records (ECI, Lok Sabha, Rajya Sabha, PRS, ADR)
- 5 `AdZone` records (all enabled by default)
- Full-text search trigger on `politicians`

---

## 4. Run Development Server

```bash
pnpm dev
```

Open: http://localhost:3000

Admin panel: http://localhost:3000/admin
(Requires a Supabase Auth session — use the magic link flow or create an admin user via
the Supabase dashboard → Authentication → Users → Invite user)

---

## 5. Run the Scraping Pipeline Locally

```bash
# Full pipeline (all sources)
curl -X POST http://localhost:3000/api/admin/refresh \
  -H "Authorization: Bearer $PIPELINE_SECRET" \
  -H "Content-Type: application/json"

# Targeted scrape (single source by ID)
curl -X POST http://localhost:3000/api/admin/refresh/<dataSourceId> \
  -H "Authorization: Bearer $PIPELINE_SECRET"
```

Or trigger from the admin panel UI at http://localhost:3000/admin/refresh.

---

## 6. Score Recalculation

```bash
# Recalculate all scores (after bulk data load)
curl -X POST http://localhost:3000/api/admin/scores/recalculate-all \
  -H "Cookie: <supabase-session-cookie>"
```

Or use the admin panel at http://localhost:3000/admin/scores.

---

## 7. GitHub Actions Cron Setup

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add `PIPELINE_SECRET` and `APP_URL` (production URL)
3. The workflow file at `.github/workflows/weekly-refresh.yml` runs the pipeline:

```yaml
# .github/workflows/weekly-refresh.yml
name: Weekly Data Refresh
on:
  schedule:
    - cron: '30 20 * * 0'   # Sunday 20:30 UTC = Sunday 2:00 AM IST
  workflow_dispatch:          # Manual trigger from GitHub UI

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger refresh pipeline
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/admin/refresh \
            -H "Authorization: Bearer ${{ secrets.PIPELINE_SECRET }}" \
            -H "Content-Type: application/json" \
            --fail
```

---

## 8. Key Commands Reference

```bash
pnpm dev                          # Start dev server
pnpm build                        # Production build
pnpm start                        # Start production server
pnpm lint                         # ESLint
pnpm typecheck                    # TypeScript type check
pnpm prisma migrate dev           # Apply schema changes
pnpm prisma studio                # Open Prisma DB browser
pnpm prisma db seed               # Re-seed data sources and ad zones
```

---

## 9. Playwright Scraper Dev

Individual scrapers can be tested in isolation:

```bash
# Test ECI scraper
npx tsx src/lib/scrapers/eci.ts

# Test with visible browser (debug mode)
PLAYWRIGHT_HEADLESS=false npx tsx src/lib/scrapers/lok-sabha.ts
```

Scraper output is logged to stdout in JSON format. Real runs write to the database.

---

## 10. Validation Checklist

After initial setup, verify:
- [ ] `pnpm dev` starts without errors
- [ ] `/politicians` page loads (empty state if no data seeded yet)
- [ ] `/admin` redirects to login for unauthenticated requests
- [ ] Admin can log in via magic link
- [ ] Admin can trigger a scrape from `/admin/refresh`
- [ ] `RefreshLog` entry appears in Supabase dashboard after scrape
- [ ] Score recalculation runs without errors after data is available
- [ ] Correction submission form at `/corrections` is rate-limited (test with 6 rapid submissions)
