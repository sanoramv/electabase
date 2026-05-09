import { PrismaClient } from "@prisma/client";
import { computeCorruptionScore, ALGORITHM_VERSION as CORR_VERSION } from "../src/lib/scoring/corruption";
import { computeEffectivenessScore, ALGORITHM_VERSION as EFF_VERSION } from "../src/lib/scoring/effectiveness";
import { computeRankings } from "../src/lib/scoring/rankings";

const prisma = new PrismaClient();

async function main() {
  const politicians = await prisma.politician.findMany({
    where: { isPublished: true },
    include: {
      attendanceRecords: true,
      achievements: true,
      parliamentaryTenures: true,
      crimeRecords: true,
      corruptionRecords: true,
      electionContests: { select: { state: true }, take: 1, orderBy: { electionYear: "desc" } },
    },
  });

  console.log(`Scoring ${politicians.length} politicians…`);

  const allQuestions = politicians.map((p) => p.attendanceRecords.reduce((s, r) => s + r.questionsRaised, 0));
  const allDebates   = politicians.map((p) => p.attendanceRecords.reduce((s, r) => s + r.debatesParticipated, 0));
  const allBills     = politicians.map((p) => p.attendanceRecords.reduce((s, r) => s + r.privateBillsIntroduced, 0));

  const p75 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  };

  const benchmarks = { questionsP75: p75(allQuestions), debatesP75: p75(allDebates), privateBillsP75: p75(allBills) };

  const effScores: { politicianId: string; score: number; partyId?: string | null; state?: string | null }[] = [];
  const corrScores: { politicianId: string; score: number; partyId?: string | null; state?: string | null }[] = [];

  for (const p of politicians) {
    const state   = p.electionContests[0]?.state ?? null;
    const partyId = p.currentPartyId;

    const eff  = computeEffectivenessScore({
      politician: { id: p.id, countryCode: p.countryCode, dateOfBirth: p.dateOfBirth },
      attendanceRecords: p.attendanceRecords,
      achievements: p.achievements,
      tenures: p.parliamentaryTenures,
      benchmarks,
    });

    const corr = computeCorruptionScore({
      crimeRecords: p.crimeRecords,
      corruptionRecords: p.corruptionRecords,
      hasAssetDiscrepancy: false,
    });

    console.log(`  ${p.fullName}: eff=${eff.score} corr=${corr.score} (crimes=${p.crimeRecords.length})`);

    await prisma.effectivenessScore.create({
      data: { politicianId: p.id, countryCode: p.countryCode, score: eff.score, algorithmVersion: EFF_VERSION, scoreBreakdown: eff.breakdown as object },
    });
    await prisma.corruptionScore.create({
      data: { politicianId: p.id, countryCode: p.countryCode, score: corr.score, algorithmVersion: CORR_VERSION, scoreBreakdown: corr.breakdown as object },
    });

    effScores.push({ politicianId: p.id, score: eff.score, partyId, state });
    corrScores.push({ politicianId: p.id, score: corr.score, partyId, state });
  }

  const rankedEff  = computeRankings(effScores, true);
  const rankedCorr = computeRankings(corrScores, true);

  for (const r of rankedEff) {
    await prisma.effectivenessScore.updateMany({
      where: { politicianId: r.politicianId, algorithmVersion: EFF_VERSION },
      data: { rankNational: r.rankNational, rankParty: r.rankParty, rankState: r.rankState },
    });
  }
  for (const r of rankedCorr) {
    await prisma.corruptionScore.updateMany({
      where: { politicianId: r.politicianId, algorithmVersion: CORR_VERSION },
      data: { rankNational: r.rankNational, rankParty: r.rankParty, rankState: r.rankState },
    });
  }

  console.log("\nDone. Ranks assigned.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
