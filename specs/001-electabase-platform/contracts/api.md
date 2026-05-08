# API Contracts: ElectaBase Platform

**Branch**: `001-electabase-platform` | **Date**: 2026-05-08
**Type**: Next.js App Router API routes (REST over HTTP)
**Auth**: Public routes — no auth. Admin routes — Supabase Auth session cookie required.
**Base**: All routes relative to application root. Format: `application/json`.

---

## Public API Routes

### `GET /api/politicians`
Paginated, filterable list of published politicians.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number, default 1 |
| `limit` | int | Records per page, default 20, max 100 |
| `party` | string | Party slug filter |
| `state` | string | State name filter |
| `house` | `LOK_SABHA\|RAJYA_SABHA` | House filter |
| `gender` | string | Gender filter |
| `education` | string | Education level filter |
| `effectivenessMin` | number | Min effectiveness score (0–100) |
| `effectivenessMax` | number | Max effectiveness score (0–100) |
| `corruptionMin` | number | Min corruption score (0–100) |
| `corruptionMax` | number | Max corruption score (0–100) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "string",
      "slug": "string",
      "fullName": "string",
      "displayName": "string",
      "photoUrl": "string|null",
      "currentParty": { "slug": "string", "abbreviation": "string" },
      "state": "string",
      "effectivenessScore": { "score": 74.2, "rankNational": 45 },
      "corruptionScore": { "score": 12.0, "rankNational": 302 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 4823, "totalPages": 242 }
}
```

---

### `GET /api/politicians/search`
Full-text search across name, party, constituency, state.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (required, min 2 chars) |
| `limit` | int | Max results, default 10, max 20 |

**Response 200**:
```json
{
  "data": [
    {
      "slug": "string",
      "fullName": "string",
      "displayName": "string",
      "currentParty": { "abbreviation": "string" },
      "photoUrl": "string|null"
    }
  ]
}
```

**Response 400**: `{ "error": "Query must be at least 2 characters" }`

---

### `GET /api/politicians/[slug]`
Full politician profile with all associated records.

**Response 200**:
```json
{
  "id": "string",
  "slug": "string",
  "fullName": "string",
  "displayName": "string",
  "photoUrl": "string|null",
  "photoSourceUrl": "string|null",
  "dateOfBirth": "ISO8601|null",
  "placeOfBirth": "string|null",
  "gender": "string|null",
  "highestEducation": "string|null",
  "businesses": [{ "name": "string", "role": "string", "sourceUrl": "string" }],
  "netWorthDeclared": "number|null",
  "netWorthSourceUrl": "string|null",
  "currentParty": { "slug": "string", "name": "string", "abbreviation": "string" },
  "electionContests": [
    {
      "electionType": "LOK_SABHA",
      "electionYear": 2019,
      "constituency": "string",
      "state": "string",
      "result": "WON",
      "voteCount": 123456,
      "voteSharePercent": 52.3,
      "sourceUrl": "string"
    }
  ],
  "parliamentaryTenures": [
    {
      "house": "LOK_SABHA",
      "constituency": "string|null",
      "state": "string",
      "termStartDate": "ISO8601",
      "termEndDate": "ISO8601|null",
      "party": { "abbreviation": "string" },
      "sourceUrl": "string"
    }
  ],
  "partyAffiliations": [
    {
      "party": { "slug": "string", "name": "string", "abbreviation": "string" },
      "startDate": "ISO8601",
      "endDate": "ISO8601|null",
      "roleInParty": "string|null",
      "sourceUrl": "string"
    }
  ],
  "achievements": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "phase": "DURING_TENURE",
      "category": "LEGISLATION",
      "date": "ISO8601|null",
      "sourceUrl": "string"
    }
  ],
  "corruptionRecords": [ /* same shape as achievements + caseStatus, courtCaseNumber, jailTimeDays */ ],
  "controversies": [ /* title, description, date, category, severity, resolutionStatus, sourceUrl */ ],
  "crimeRecords": [
    {
      "id": "string",
      "chargeDescription": "string",
      "ipcSection": "string|null",
      "courtName": "string|null",
      "caseStatus": "PENDING",
      "verdictDate": "ISO8601|null",
      "jailTimeDays": "number|null",
      "sourceUrl": "string"
    }
  ],
  "attendanceRecords": [
    {
      "house": "LOK_SABHA",
      "sessionName": "string",
      "year": 2023,
      "totalSessions": 50,
      "sessionsAttended": 45,
      "attendancePercentage": 90.0,
      "questionsRaised": 12,
      "billsParticipated": 8,
      "debatesParticipated": 5,
      "privateBillsIntroduced": 1,
      "sourceUrl": "string"
    }
  ],
  "effectivenessScore": {
    "score": 74.2,
    "rankNational": 45,
    "rankParty": 3,
    "rankState": 8,
    "algorithmVersion": "effectiveness-v1.0",
    "scoreBreakdown": {
      "attendance": 18.5,
      "questions": 12.3,
      "debates": 9.0,
      "privateBills": 14.2,
      "billsParticipation": 8.0,
      "achievements": 10.2,
      "tenureDuration": 2.0
    },
    "computedAt": "ISO8601"
  },
  "corruptionScore": {
    "score": 12.0,
    "rankNational": 302,
    "rankParty": 21,
    "rankState": 40,
    "algorithmVersion": "corruption-v1.0",
    "scoreBreakdown": {
      "criminalCases": 6.0,
      "convictions": 0.0,
      "jailTime": 0.0,
      "corruptionRecords": 6.0,
      "electoralMalpractice": 0.0,
      "assetDiscrepancy": 0.0
    },
    "computedAt": "ISO8601"
  }
}
```

**Response 404**: `{ "error": "Politician not found" }`

---

### `GET /api/compare`
Side-by-side data for 2–4 politicians.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `ids` | string | Comma-separated politician slugs (2–4 required) |

**Response 200**: Array of full politician profiles (same shape as `GET /api/politicians/[slug]`).
**Response 400**: `{ "error": "Provide 2 to 4 politician slugs" }`

---

### `GET /api/parties`
Paginated list of all active parties.

**Response 200**: `{ "data": [{ "slug", "name", "abbreviation", "logoUrl", "memberCount" }], "pagination": {...} }`

---

### `GET /api/parties/[slug]`
Full party profile with affiliated politicians and aggregate scores.

**Response 200**:
```json
{
  "slug": "string",
  "name": "string",
  "abbreviation": "string",
  "logoUrl": "string|null",
  "foundedYear": "number|null",
  "ideologyTags": ["string"],
  "sourceUrl": "string",
  "aggregateScores": {
    "avgEffectiveness": 58.4,
    "avgCorruption": 18.2,
    "avgAttendance": 74.1
  },
  "members": [ /* array of politician summary objects */ ],
  "pagination": { "page": 1, "limit": 20, "total": 143 }
}
```

---

### `GET /api/leaderboards`
National rankings with optional filters.

**Query params**: `category` (required: `effectiveness|corruption|attendance|questions|bills`), `state`, `party`, `house`, `page`, `limit`

**Response 200**:
```json
{
  "category": "effectiveness",
  "data": [
    {
      "rank": 1,
      "politician": { "slug": "string", "displayName": "string", "currentParty": {...} },
      "score": 92.4,
      "state": "string"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 4823 }
}
```

---

### `POST /api/corrections`
Submit a data correction. Rate-limited: 5/hour per IP.

**Request body**:
```json
{
  "politicianId": "string",
  "fieldInQuestion": "string",
  "currentValue": "string",
  "suggestedValue": "string",
  "reason": "string",
  "evidenceUrl": "string|null",
  "submittedByEmail": "string"
}
```

**Response 201**: `{ "id": "string", "statusUrl": "/corrections/{id}" }`
**Response 400**: `{ "error": "Validation error details" }`
**Response 429**: `{ "error": "Rate limit exceeded. Max 5 submissions per hour." }`

---

### `GET /api/corrections/[id]`
Check correction submission status (public).

**Response 200**: `{ "id": "string", "status": "PENDING|APPROVED|REJECTED", "createdAt": "ISO8601" }`
**Response 404**: `{ "error": "Correction not found" }`

---

## Admin API Routes

All admin routes require a valid Supabase Auth session cookie.
Unauthenticated requests return `401 { "error": "Unauthorized" }`.
All mutating actions are logged with admin ID and timestamp.

### `POST /api/admin/refresh`
Trigger a full pipeline re-scrape of all active sources.

**Request body**: `{}` (empty)
**Response 202**: `{ "refreshLogId": "string", "message": "Refresh pipeline started" }`

---

### `POST /api/admin/refresh/[sourceId]`
Trigger a targeted re-scrape of a single data source.

**Response 202**: `{ "refreshLogId": "string", "sourceId": "string" }`
**Response 404**: `{ "error": "Data source not found" }`

---

### `GET /api/admin/refresh/logs`
Paginated refresh log history with per-source breakdown.

**Response 200**:
```json
{
  "data": [
    {
      "id": "string",
      "triggeredBy": "SCHEDULED",
      "triggeredAt": "ISO8601",
      "completedAt": "ISO8601|null",
      "status": "SUCCESS",
      "recordsUpdated": 142,
      "recordsAdded": 17,
      "sourceResults": [
        {
          "dataSource": { "id": "string", "name": "ECI" },
          "status": "SUCCESS",
          "recordsScraped": 89,
          "errorDetail": null,
          "durationMs": 4200
        }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 52 }
}
```

---

### `GET /api/admin/corrections`
List correction submissions (filterable by status).

**Query params**: `status` (PENDING|APPROVED|REJECTED), `page`, `limit`
**Response 200**: Array of correction submissions including `submittedByEmail` (admin-visible only).

---

### `POST /api/admin/corrections/[id]/approve`
Approve a correction — updates the target field and sets status to APPROVED.
Anonymises submitter email after approval.

**Request body**: `{ "reviewNote": "string|null" }`
**Response 200**: `{ "id": "string", "status": "APPROVED" }`

---

### `POST /api/admin/corrections/[id]/reject`
Reject a correction. Anonymises submitter email after rejection.

**Request body**: `{ "reviewNote": "string" }`
**Response 200**: `{ "id": "string", "status": "REJECTED" }`

---

### `GET/POST/PUT/DELETE /api/admin/politicians`
CRUD for politician records. POST creates draft. PUT updates. DELETE soft-deletes
(sets `isPublished: false`, does not destroy data).

**POST request body**: All `Politician` fields except computed/system fields.
Requires `source_url` or `photoSourceUrl` for respective fields before publish.

### `POST /api/admin/politicians/[id]/publish`
Publishes a politician (sets `isPublished: true`). Validates all required source URLs present.

**Response 400 if validation fails**:
```json
{ "error": "Cannot publish: missing source URLs for fields: [netWorthDeclared]" }
```

### `POST /api/admin/politicians/[id]/rescore`
Triggers score recalculation for a single politician.

**Response 202**: `{ "message": "Score recalculation queued for {displayName}" }`

---

### `POST /api/admin/scores/recalculate-all`
Triggers full recalculation of all politicians' scores. Long-running — returns immediately,
runs async.

**Response 202**: `{ "message": "Full score recalculation started" }`

---

### `GET/POST/PUT /api/admin/sources`
CRUD for the data source registry.

**PUT body** (deactivate): `{ "isActive": false }` — removes source from future scraping runs.

---

### `GET/PUT /api/admin/ads`
Manage ad zone on/off configuration.

**GET response**: `{ "zones": [{ "zoneKey": "header-banner", "isEnabled": true }] }`
**PUT body**: `{ "zoneKey": "header-banner", "isEnabled": false }`
