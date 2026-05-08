import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET() {
  const parties = await db.party.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      abbreviation: true,
      logoUrl: true,
      foundedYear: true,
      ideologyTags: true,
      _count: { select: { currentMembers: true } },
    },
  });

  return NextResponse.json({ parties });
}
