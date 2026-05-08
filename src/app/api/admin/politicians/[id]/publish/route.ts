import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();
  const { id } = await params;

  const politician = await db.politician.findUnique({
    where: { id },
    include: { electionContests: true },
  });

  if (!politician) {
    return NextResponse.json({ error: "Politician not found" }, { status: 404 });
  }

  const missingSourceUrls: string[] = [];

  // Validate source URLs on election contests
  for (const contest of politician.electionContests) {
    if (!contest.sourceUrl) {
      missingSourceUrls.push(`electionContest:${contest.id}`);
    }
  }

  if (missingSourceUrls.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot publish: missing source URLs",
        missingFields: missingSourceUrls,
      },
      { status: 400 }
    );
  }

  await db.politician.update({
    where: { id },
    data: { isPublished: true, isVerified: true },
  });

  return NextResponse.json({ success: true });
}
