import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { correctionSubmissionSchema } from "@/lib/validation/schemas";
import { checkCorrectionRateLimit } from "@/lib/rate-limit/corrections";

export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1";
  const { allowed, remaining } = await checkCorrectionRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 5 corrections per hour." },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": String(remaining) },
      }
    );
  }

  const body = await request.json();
  const data = correctionSubmissionSchema.parse(body);

  const submission = await db.correctionSubmission.create({
    data: {
      politicianId: data.politicianId,
      submittedByEmail: data.submittedByEmail,
      fieldInQuestion: data.fieldInQuestion,
      currentValue: data.currentValue,
      suggestedValue: data.suggestedValue,
      reason: data.reason,
      evidenceUrl: data.evidenceUrl || null,
      status: "PENDING",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return NextResponse.json(
    {
      id: submission.id,
      statusUrl: `${appUrl}/corrections/${submission.id}`,
    },
    { status: 201 }
  );
}
