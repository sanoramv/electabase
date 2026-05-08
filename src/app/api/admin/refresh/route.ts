import { type NextRequest, NextResponse } from "next/server";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  // Accept PIPELINE_SECRET Bearer token (GitHub Actions) OR valid admin session
  const authHeader = request.headers.get("authorization");
  const pipelineSecret = process.env.PIPELINE_SECRET;

  const hasBearerAuth =
    pipelineSecret && authHeader === `Bearer ${pipelineSecret}`;

  if (!hasBearerAuth) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const session = hasBearerAuth ? null : await getSession();
  const adminId = session?.user?.id;

  try {
    const refreshLogId = await runFullPipeline(adminId);
    return NextResponse.json({ refreshLogId }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
