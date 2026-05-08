import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { leaderboardQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = leaderboardQuerySchema.parse(
    Object.fromEntries(searchParams.entries())
  );

  const houseFilter = query.house
    ? { parliamentaryTenures: { some: { house: query.house } } }
    : {};
  const stateFilter = query.state
    ? { parliamentaryTenures: { some: { state: query.state } } }
    : {};
  const partyFilter = query.party
    ? { currentParty: { slug: query.party } }
    : {};

  const baseWhere = {
    isPublished: true,
    ...houseFilter,
    ...stateFilter,
    ...partyFilter,
  };

  const skip = (query.page - 1) * query.limit;
  const take = query.limit;

  let politicians;

  if (query.category === "effectiveness") {
    politicians = await db.politician.findMany({
      where: { ...baseWhere, effectivenessScores: { some: {} } },
      orderBy: {
        effectivenessScores: { _count: "desc" },
      },
      skip,
      take,
      select: {
        id: true, slug: true, fullName: true, photoUrl: true,
        currentParty: { select: { name: true, abbreviation: true } },
        effectivenessScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true, rankNational: true } },
      },
    });
  } else if (query.category === "corruption") {
    politicians = await db.politician.findMany({
      where: { ...baseWhere, corruptionScores: { some: {} } },
      orderBy: { corruptionScores: { _count: "desc" } },
      skip,
      take,
      select: {
        id: true, slug: true, fullName: true, photoUrl: true,
        currentParty: { select: { name: true, abbreviation: true } },
        corruptionScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true, rankNational: true } },
      },
    });
  } else {
    // attendance, questions, bills — sort by attendance records
    politicians = await db.politician.findMany({
      where: baseWhere,
      skip,
      take,
      select: {
        id: true, slug: true, fullName: true, photoUrl: true,
        currentParty: { select: { name: true, abbreviation: true } },
        attendanceRecords: { orderBy: { year: "desc" }, take: 5 },
      },
    });
  }

  return NextResponse.json({ politicians, category: query.category });
}
