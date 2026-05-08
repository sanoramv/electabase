import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const submission = await db.correctionSubmission.findUnique({
    where: { id },
    select: { id: true, status: true, createdAt: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Correction not found" }, { status: 404 });
  }

  return NextResponse.json(submission);
}
