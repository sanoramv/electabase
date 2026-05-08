import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { compareQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = compareQuerySchema.safeParse({ ids: searchParams.get("ids") });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide 2–4 politician slugs as ?ids=slug1,slug2" },
      { status: 400 }
    );
  }

  const slugs = parsed.data.ids;

  const politicians = await db.politician.findMany({
    where: { slug: { in: slugs }, isPublished: true },
    include: {
      currentParty: true,
      electionContests: { orderBy: { electionYear: "desc" } },
      parliamentaryTenures: { orderBy: { termStartDate: "desc" } },
      attendanceRecords: { orderBy: { year: "desc" } },
      crimeRecords: true,
      corruptionRecords: true,
      effectivenessScores: { orderBy: { computedAt: "desc" }, take: 1 },
      corruptionScores: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });

  if (politicians.length < 2) {
    return NextResponse.json(
      { error: "At least 2 valid published politician slugs required" },
      { status: 400 }
    );
  }

  return NextResponse.json({ politicians });
}
