import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export interface RefreshSummary {
  id: string;
  triggeredBy: string;
  triggeredAt: Date;
  completedAt?: Date | null;
  status: string;
  recordsAdded: number;
  recordsUpdated: number;
  sourceResults?: Array<{
    dataSource: { name: string };
    status: string;
    recordsScraped: number;
    errorDetail?: string | null;
    durationMs?: number | null;
  }>;
}

export async function sendRefreshSummaryEmail(log: RefreshSummary) {
  if (!ADMIN_EMAIL) return;

  const duration =
    log.completedAt && log.triggeredAt
      ? Math.round(
          (log.completedAt.getTime() - log.triggeredAt.getTime()) / 1000
        )
      : null;

  const sourceRows =
    log.sourceResults
      ?.map(
        (s) =>
          `• ${s.dataSource.name}: ${s.status} — ${s.recordsScraped} records${s.errorDetail ? ` (${s.errorDetail})` : ""}`
      )
      .join("\n") ?? "";

  await getResend().emails.send({
    from: "ElectaBase <noreply@electabase.in>",
    to: ADMIN_EMAIL,
    subject: `ElectaBase Refresh ${log.status} — ${new Date(log.triggeredAt).toISOString().slice(0, 10)}`,
    text: [
      `Refresh ID: ${log.id}`,
      `Triggered by: ${log.triggeredBy}`,
      `Status: ${log.status}`,
      `Records added: ${log.recordsAdded}`,
      `Records updated: ${log.recordsUpdated}`,
      duration ? `Duration: ${duration}s` : "",
      "",
      "Per-source results:",
      sourceRows,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendCorrectionApprovedEmail(emailHash: string) {
  // Per DPDP Act compliance, the original email is no longer available at this point.
  // We only have the hash — no email can be sent. This function is a no-op by design.
  void emailHash;
}
