import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { politicianListQuerySchema } from "@/lib/validation/schemas";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = politicianListQuerySchema.parse(
    Object.fromEntries(searchParams.entries())
  );

  const where = {
    isPublished: true,
    ...(query.party && { currentParty: { slug: query.party } }),
    ...(query.house && {
      parliamentaryTenures: { some: { house: query.house } },
    }),
    ...(query.gender && { gender: query.gender }),
    // Full-text search using tsvector
    ...(query.q && {
      searchVector: {
        search: query.q.split(" ").join(" & "),
      },
    }),
  } satisfies Prisma.PoliticianWhereInput;

  const [politicians, total] = await Promise.all([
    db.politician.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        slug: true,
        fullName: true,
        displayName: true,
        photoUrl: true,
        gender: true,
        countryCode: true,
        dateOfBirth: true,
        currentParty: { select: { name: true, abbreviation: true, slug: true } },
        effectivenessScores: {
          orderBy: { computedAt: "desc" },
          take: 1,
          select: { score: true, rankNational: true },
        },
        corruptionScores: {
          orderBy: { computedAt: "desc" },
          take: 1,
          select: { score: true, rankNational: true },
        },
        attendanceRecords: {
          select: { attendancePercentage: true },
          orderBy: { year: "desc" },
          take: 1,
        },
        electionContests: {
          select: { state: true },
          orderBy: { electionYear: "desc" },
          take: 1,
        },
      },
    }),
    db.politician.count({ where }),
  ]);

  return NextResponse.json({
    politicians,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
}
