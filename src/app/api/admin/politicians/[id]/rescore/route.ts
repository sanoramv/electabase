import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { computeEffectivenessScore, ALGORITHM_VERSION as EFF_VERSION } from "@/lib/scoring/effectiveness";
import { computeCorruptionScore, ALGORITHM_VERSION as CORR_VERSION } from "@/lib/scoring/corruption";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();
  const { id } = await params;

  const politician = await db.politician.findUnique({
    where: { id },
    include: {
      attendanceRecords: true,
      achievements: true,
      parliamentaryTenures: true,
      crimeRecords: true,
      corruptionRecords: true,
    },
  });

  if (!politician) {
    return NextResponse.json({ error: "Politician not found" }, { status: 404 });
  }

  // Compute benchmarks — simplified: use fixed p75 values for single-politician rescore
  const benchmarks = { questionsP75: 100, debatesP75: 50, privateBillsP75: 5 };

  const effResult = computeEffectivenessScore({
    politician: {
      id: politician.id,
      countryCode: politician.countryCode,
      dateOfBirth: politician.dateOfBirth,
    },
    attendanceRecords: politician.attendanceRecords,
    achievements: politician.achievements,
    tenures: politician.parliamentaryTenures,
    benchmarks,
  });

  const corrResult = computeCorruptionScore({
    crimeRecords: politician.crimeRecords,
    corruptionRecords: politician.corruptionRecords,
    hasAssetDiscrepancy: false,
  });

  // Insert new score rows (append-only)
  await db.effectivenessScore.create({
    data: {
      politicianId: id,
      countryCode: politician.countryCode,
      score: effResult.score,
      algorithmVersion: EFF_VERSION,
      scoreBreakdown: effResult.breakdown as object,
    },
  });

  await db.corruptionScore.create({
    data: {
      politicianId: id,
      countryCode: politician.countryCode,
      score: corrResult.score,
      algorithmVersion: CORR_VERSION,
      scoreBreakdown: corrResult.breakdown as object,
    },
  });

  return NextResponse.json({
    effectiveness: effResult.score,
    corruption: corrResult.score,
  });
}
