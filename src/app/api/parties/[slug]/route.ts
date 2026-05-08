import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const party = await db.party.findUnique({
    where: { slug },
    include: {
      currentMembers: {
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          fullName: true,
          photoUrl: true,
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
        },
      },
    },
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  return NextResponse.json({ party });
}
