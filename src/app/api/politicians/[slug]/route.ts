import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const politician = await db.politician.findFirst({
    where: { slug, isPublished: true },
    include: {
      currentParty: true,
      electionContests: { orderBy: { electionYear: "desc" } },
      parliamentaryTenures: { orderBy: { termStartDate: "desc" }, include: { party: true } },
      partyAffiliations: { orderBy: { startDate: "desc" }, include: { party: true } },
      achievements: { orderBy: { date: "desc" } },
      corruptionRecords: { orderBy: { date: "desc" } },
      controversies: { orderBy: { date: "desc" } },
      crimeRecords: { orderBy: { createdAt: "desc" } },
      attendanceRecords: { orderBy: { year: "desc" } },
      effectivenessScores: {
        orderBy: { computedAt: "desc" },
        take: 1,
      },
      corruptionScores: {
        orderBy: { computedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!politician) {
    return NextResponse.json({ error: "Politician not found" }, { status: 404 });
  }

  return NextResponse.json({ politician });
}
