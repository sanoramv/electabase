/**
 * Processes all 360 myneta_serious_crimes records into the main database:
 *   1. Match existing politicians by name
 *   2. Create missing parties
 *   3. Create missing politicians
 *   4. Create ElectionContest records
 *   5. Create CrimeRecord entries
 *   6. Create CorruptionRecord entries
 *   7. Recompute corruption scores for affected politicians
 */
import { PrismaClient } from "@prisma/client";
import {
  computeCorruptionScore,
  ALGORITHM_VERSION as CORR_VERSION,
} from "../src/lib/scoring/corruption";
import { computeRankings } from "../src/lib/scoring/rankings";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveAbbreviation(name: string): string {
  const stop = new Set(["of", "the", "and", "for", "in", "a", "an"]);
  const words = name.split(/[\s\-()]+/).filter((w) => w.length > 0);
  let abbr = words
    .filter((w) => !stop.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("");
  if (abbr.length === 0) abbr = words.map((w) => w[0].toUpperCase()).join("");
  return abbr.slice(0, 6) || name.slice(0, 4).toUpperCase();
}

function parseRupees(raw: string): number | null {
  const m = raw.match(/Rs[\s ]*([\d,]+)/i);
  if (!m) return null;
  return parseInt(m[1].replace(/,/g, ""), 10);
}

// ─── Counters ─────────────────────────────────────────────────────────────────

let matched = 0;
let newPoliticians = 0;
let newParties = 0;
let crimeRecordsCreated = 0;
let corruptionRecordsCreated = 0;
let electionContestsCreated = 0;
let scoresUpdated = 0;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── STEP 1: Load all scraped records ────────────────────────────────────────
  console.log("STEP 1 — Loading scraped records and existing politicians...");

  const scraped = await prisma.mynetaSeriousCrime.findMany({
    where: { electionYear: 2026, state: "Tamil Nadu" },
    orderBy: { id: "asc" },
  });
  console.log(`  Loaded ${scraped.length} scraped candidates`);

  const existingPoliticians = await prisma.politician.findMany({
    select: { id: true, fullName: true, currentPartyId: true },
  });
  const nameToId = new Map<string, string>();
  for (const p of existingPoliticians) {
    nameToId.set(normName(p.fullName), p.id);
  }
  console.log(`  Loaded ${existingPoliticians.length} existing politicians`);

  // ── STEP 2: Create missing parties ──────────────────────────────────────────
  console.log("\nSTEP 2 — Creating missing parties...");

  const existingParties = await prisma.party.findMany({
    select: { id: true, name: true, abbreviation: true },
  });
  const partyNameToId = new Map<string, string>();
  for (const p of existingParties) {
    partyNameToId.set(normName(p.name), p.id);
    partyNameToId.set(normName(p.abbreviation), p.id);
  }

  const uniquePartyNames = [...new Set(scraped.map((r) => r.party.trim()))];
  const slugsUsed = new Set(
    (await prisma.party.findMany({ select: { slug: true } })).map((p) => p.slug)
  );

  for (const partyName of uniquePartyNames) {
    if (!partyName || partyNameToId.has(normName(partyName))) continue;
    const abbr = deriveAbbreviation(partyName);
    let slug = toSlug(partyName);
    let counter = 1;
    while (slugsUsed.has(slug)) {
      slug = `${toSlug(partyName)}-${counter++}`;
    }
    slugsUsed.add(slug);
    const party = await prisma.party.create({
      data: {
        name: partyName,
        abbreviation: abbr,
        slug,
        countryCode: "IN",
        isActive: true,
        sourceUrl: "https://www.myneta.info/TamilNadu2026/",
      },
    });
    partyNameToId.set(normName(partyName), party.id);
    console.log(`  + Party: "${partyName}" (${abbr})`);
    newParties++;
  }
  console.log(`  Created ${newParties} new parties`);

  // ── STEP 3: Create missing politicians ──────────────────────────────────────
  console.log("\nSTEP 3 — Matching and creating politicians...");

  const politicianSlugsUsed = new Set(
    (await prisma.politician.findMany({ select: { slug: true } })).map(
      (p) => p.slug
    )
  );

  // Map scraped id → politician id (resolved after STEP 3)
  const scrapedIdToPoliticianId = new Map<number, string>();

  for (const row of scraped) {
    const normalised = normName(row.candidateName);
    const existingId = nameToId.get(normalised);

    if (existingId) {
      scrapedIdToPoliticianId.set(row.id, existingId);
      matched++;
      continue;
    }

    // Resolve party id for this candidate
    const partyId = partyNameToId.get(normName(row.party)) ?? null;

    // Parse education and net worth
    const education = row.education && row.education !== "N/A" ? row.education : null;
    const assets = parseRupees(row.totalAssetsRaw);
    const liabilities = parseRupees(row.liabilitiesRaw);
    const netWorth =
      assets !== null
        ? liabilities !== null
          ? assets - liabilities
          : assets
        : null;

    // Generate unique slug
    let slug = toSlug(row.candidateName) + "-tn2026";
    let counter = 1;
    while (politicianSlugsUsed.has(slug)) {
      slug = `${toSlug(row.candidateName)}-tn2026-${counter++}`;
    }
    politicianSlugsUsed.add(slug);

    const politician = await prisma.politician.create({
      data: {
        slug,
        fullName: row.candidateName,
        displayName: row.candidateName,
        countryCode: "IN",
        isPublished: true,
        isVerified: false,
        currentPartyId: partyId,
        highestEducation: education,
        netWorthDeclared: netWorth !== null ? netWorth : undefined,
        netWorthSourceUrl: netWorth !== null ? row.candidateProfileUrl : undefined,
      },
    });

    scrapedIdToPoliticianId.set(row.id, politician.id);
    nameToId.set(normalised, politician.id);
    newPoliticians++;
  }

  console.log(`  Matched existing: ${matched}`);
  console.log(`  Created new:      ${newPoliticians}`);

  // ── STEP 4: ElectionContest records ─────────────────────────────────────────
  console.log("\nSTEP 4 — Creating ElectionContest records...");

  for (const row of scraped) {
    const politicianId = scrapedIdToPoliticianId.get(row.id);
    if (!politicianId) continue;

    const existing = await prisma.electionContest.findFirst({
      where: {
        politicianId,
        electionYear: 2026,
        constituency: row.constituency,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.electionContest.create({
      data: {
        politicianId,
        countryCode: "IN",
        electionType: "STATE",
        electionYear: 2026,
        constituency: row.constituency,
        state: "Tamil Nadu",
        result: "LOST", // placeholder — update when official results are available
        sourceUrl: row.candidateProfileUrl,
      },
    });
    electionContestsCreated++;
  }
  console.log(`  Created ${electionContestsCreated} ElectionContest records`);

  // ── STEP 5: CrimeRecord entries ──────────────────────────────────────────────
  console.log("\nSTEP 5 — Creating CrimeRecord entries...");

  for (const row of scraped) {
    const politicianId = scrapedIdToPoliticianId.get(row.id);
    if (!politicianId) continue;

    const existing = await prisma.crimeRecord.findFirst({
      where: { politicianId, sourceUrl: row.candidateProfileUrl },
      select: { id: true },
    });
    if (existing) continue;

    // Create one CrimeRecord per declared serious case
    const count = row.criminalCasesCount > 0 ? row.criminalCasesCount : 1;
    for (let i = 0; i < count; i++) {
      await prisma.crimeRecord.create({
        data: {
          politicianId,
          countryCode: "IN",
          chargeDescription: "Serious criminal case declared in election affidavit",
          caseStatus: "PENDING",
          sourceUrl: row.candidateProfileUrl,
          isVerified: true,
        },
      });
      crimeRecordsCreated++;
    }
  }
  console.log(`  Created ${crimeRecordsCreated} CrimeRecord entries`);

  // ── STEP 6: CorruptionRecord entries ─────────────────────────────────────────
  console.log("\nSTEP 6 — Creating CorruptionRecord entries...");

  for (const row of scraped) {
    const politicianId = scrapedIdToPoliticianId.get(row.id);
    if (!politicianId) continue;

    const existing = await prisma.corruptionRecord.findFirst({
      where: { politicianId, sourceUrl: row.candidateProfileUrl },
      select: { id: true },
    });
    if (existing) continue;

    const n = row.criminalCasesCount;
    await prisma.corruptionRecord.create({
      data: {
        politicianId,
        countryCode: "IN",
        title: "Serious criminal case(s) declared in TN 2026 election affidavit",
        description: `Candidate declared ${n} serious criminal case${n !== 1 ? "s" : ""} in their affidavit submitted to the Election Commission of India for Tamil Nadu 2026 elections`,
        category: "CRIMINAL",
        phase: "BEFORE_TENURE",
        isVerified: true,
        sourceUrl: row.candidateProfileUrl,
      },
    });
    corruptionRecordsCreated++;
  }
  console.log(`  Created ${corruptionRecordsCreated} CorruptionRecord entries`);

  // ── STEP 7: Recompute corruption scores ──────────────────────────────────────
  console.log("\nSTEP 7 — Recomputing corruption scores...");

  // Find all politicians with at least one PENDING CrimeRecord
  const affected = await prisma.politician.findMany({
    where: {
      crimeRecords: { some: { caseStatus: "PENDING" } },
    },
    include: {
      crimeRecords: true,
      corruptionRecords: true,
      electionContests: {
        select: { state: true },
        orderBy: { electionYear: "desc" },
        take: 1,
      },
    },
  });

  console.log(`  Scoring ${affected.length} politicians with PENDING crimes...`);

  const scoreEntries: {
    politicianId: string;
    score: number;
    partyId: string | null;
    state: string | null;
  }[] = [];

  for (const p of affected) {
    const corr = computeCorruptionScore({
      crimeRecords: p.crimeRecords,
      corruptionRecords: p.corruptionRecords,
      hasAssetDiscrepancy: false,
    });

    await prisma.corruptionScore.create({
      data: {
        politicianId: p.id,
        countryCode: p.countryCode,
        score: corr.score,
        algorithmVersion: CORR_VERSION,
        scoreBreakdown: corr.breakdown as object,
      },
    });

    scoreEntries.push({
      politicianId: p.id,
      score: corr.score,
      partyId: p.currentPartyId,
      state: p.electionContests[0]?.state ?? null,
    });
    scoresUpdated++;
  }

  // Apply national/party/state rankings
  const ranked = computeRankings(scoreEntries, true);
  for (const r of ranked) {
    await prisma.corruptionScore.updateMany({
      where: {
        politicianId: r.politicianId,
        algorithmVersion: CORR_VERSION,
      },
      data: {
        rankNational: r.rankNational,
        rankParty: r.rankParty,
        rankState: r.rankState,
      },
    });
  }
  console.log(`  Updated ${scoresUpdated} corruption scores with rankings`);

  // ── STEP 9: Summary ───────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(64));
  console.log("FINAL SUMMARY");
  console.log("═".repeat(64));
  console.log(`  Total candidates processed:    ${scraped.length}`);
  console.log(`  Matched to existing politicians: ${matched}`);
  console.log(`  New politicians created:         ${newPoliticians}`);
  console.log(`  New parties created:             ${newParties}`);
  console.log(`  ElectionContest records created: ${electionContestsCreated}`);
  console.log(`  CrimeRecord entries created:     ${crimeRecordsCreated}`);
  console.log(`  CorruptionRecord entries created: ${corruptionRecordsCreated}`);
  console.log(`  Corruption scores updated:       ${scoresUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
