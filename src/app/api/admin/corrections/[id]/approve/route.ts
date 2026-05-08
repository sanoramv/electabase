import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { createHash } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { reviewNote?: string };

  const submission = await db.correctionSubmission.findUnique({ where: { id } });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.status !== "PENDING") {
    return NextResponse.json({ error: "Submission already reviewed" }, { status: 409 });
  }

  // Anonymise email per DPDP Act 2023: hash and null the original
  const emailHash = submission.submittedByEmail
    ? createHash("sha256").update(submission.submittedByEmail).digest("hex")
    : null;

  await db.correctionSubmission.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedByAdminId: session.user.id,
      reviewedAt: new Date(),
      reviewNote: body.reviewNote ?? null,
      submittedByEmail: null,
      emailHash,
    },
  });

  // Apply the correction to the relevant politician field
  // The fieldInQuestion uses dot notation e.g. "fullName", "photoUrl"
  // For simple top-level scalar fields on Politician:
  const allowedFields = [
    "fullName", "displayName", "photoUrl", "photoSourceUrl",
    "dateOfBirth", "placeOfBirth", "gender", "highestEducation",
    "educationInstitution", "netWorthDeclared", "netWorthSourceUrl",
  ];

  if (allowedFields.includes(submission.fieldInQuestion)) {
    await db.politician.update({
      where: { id: submission.politicianId },
      data: { [submission.fieldInQuestion]: submission.suggestedValue },
    });
  }

  return NextResponse.json({ success: true });
}
