import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { computeEffectivenessScore, ALGORITHM_VERSION as EFF_VERSION } from "@/lib/scoring/effectiveness";
import { computeCorruptionScore, ALGORITHM_VERSION as CORR_VERSION } from "@/lib/scoring/corruption";
import { computeRankings } from "@/lib/scoring/rankings";

export async function POST() {
  await requireAdminSession();

  // Fire-and-forget: return 202 immediately, run scoring in background
  setImmediate(async () => {
    const politicians = await db.politician.findMany({
      where: { isPublished: true },
      include: {
        attendanceRecords: true,
        achievements: true,
        parliamentaryTenures: true,
        crimeRecords: true,
        corruptionRecords: true,
        currentParty: { select: { id: true } },
        electionContests: { select: { state: true }, take: 1, orderBy: { electionYear: "desc" } },
      },
    });

    // Compute global p75 benchmarks across all politicians
    const allQuestions = politicians.map((p) =>
      p.attendanceRecords.reduce((s, r) => s + r.questionsRaised, 0)
    );
    const allDebates = politicians.map((p) =>
      p.attendanceRecords.reduce((s, r) => s + r.debatesParticipated, 0)
    );
    const allBills = politicians.map((p) =>
      p.attendanceRecords.reduce((s, r) => s + r.privateBillsIntroduced, 0)
    );

    const p75 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.75)] ?? 0;
    };

    const benchmarks = {
      questionsP75: p75(allQuestions),
      debatesP75: p75(allDebates),
      privateBillsP75: p75(allBills),
    };

    const effScores: { politicianId: string; score: number; partyId?: string | null; state?: string | null }[] = [];
    const corrScores: { politicianId: string; score: number; partyId?: string | null; state?: string | null }[] = [];

    for (const p of politicians) {
      const state = p.electionContests[0]?.state ?? null;
      const partyId = p.currentPartyId;

      const eff = computeEffectivenessScore({
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

      effScores.push({ politicianId: p.id, score: eff.score, partyId, state });
      corrScores.push({ politicianId: p.id, score: corr.score, partyId, state });

      await db.effectivenessScore.create({
        data: {
          politicianId: p.id,
          countryCode: p.countryCode,
          score: eff.score,
          algorithmVersion: EFF_VERSION,
          scoreBreakdown: eff.breakdown as object,
        },
      });

      await db.corruptionScore.create({
        data: {
          politicianId: p.id,
          countryCode: p.countryCode,
          score: corr.score,
          algorithmVersion: CORR_VERSION,
          scoreBreakdown: corr.breakdown as object,
        },
      });
    }

    // Compute and persist ranks
    const rankedEff = computeRankings(effScores, true);
    const rankedCorr = computeRankings(corrScores, true);

    for (const r of rankedEff) {
      await db.effectivenessScore.updateMany({
        where: { politicianId: r.politicianId, algorithmVersion: EFF_VERSION },
        data: { rankNational: r.rankNational, rankParty: r.rankParty, rankState: r.rankState },
      });
    }
    for (const r of rankedCorr) {
      await db.corruptionScore.updateMany({
        where: { politicianId: r.politicianId, algorithmVersion: CORR_VERSION },
        data: { rankNational: r.rankNational, rankParty: r.rankParty, rankState: r.rankState },
      });
    }
  });

  return NextResponse.json(
    { message: "Score recalculation started for all published politicians" },
    { status: 202 }
  );
}
