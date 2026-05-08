import { type NextRequest, NextResponse } from "next/server";
import { runTargetedPipeline } from "@/lib/pipeline/orchestrator";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const session = await requireAdminSession();
  const { sourceId } = await params;

  try {
    const refreshLogId = await runTargetedPipeline(sourceId, session.user.id);
    return NextResponse.json({ refreshLogId, sourceId }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
