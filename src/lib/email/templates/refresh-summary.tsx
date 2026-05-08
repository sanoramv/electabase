import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Row,
  Column,
  Hr,
} from "@react-email/components";

interface SourceResult {
  dataSource: { name: string };
  status: string;
  recordsScraped: number;
  errorDetail: string | null;
  durationMs: number | null;
}

interface RefreshSummaryProps {
  triggeredBy: string;
  triggeredAt: Date;
  completedAt: Date | null;
  status: string;
  recordsAdded: number;
  recordsUpdated: number;
  sourceResults: SourceResult[];
}

export default function RefreshSummaryEmail({
  triggeredBy,
  triggeredAt,
  completedAt,
  status,
  recordsAdded,
  recordsUpdated,
  sourceResults,
}: RefreshSummaryProps) {
  const duration =
    completedAt && triggeredAt
      ? Math.round((completedAt.getTime() - triggeredAt.getTime()) / 1000)
      : null;

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", padding: "20px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#fff", borderRadius: "8px", padding: "24px", border: "1px solid #e5e7eb" }}>
          <Heading style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", marginBottom: "4px" }}>
            ElectaBase — Data Refresh {status === "SUCCESS" ? "✓" : status === "FAILED" ? "✗" : "⚠"}
          </Heading>
          <Text style={{ color: "#6b7280", fontSize: "13px", marginTop: 0 }}>
            {triggeredAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · Triggered by {triggeredBy}
            {duration !== null && ` · ${duration}s`}
          </Text>

          <Section style={{ background: status === "SUCCESS" ? "#f0fdf4" : status === "FAILED" ? "#fef2f2" : "#fffbeb", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px" }}>
            <Text style={{ margin: 0, fontWeight: "bold", color: status === "SUCCESS" ? "#15803d" : status === "FAILED" ? "#b91c1c" : "#92400e" }}>
              {status}
            </Text>
            <Text style={{ margin: "4px 0 0", color: "#374151", fontSize: "13px" }}>
              +{recordsAdded} records added · {recordsUpdated} records updated
            </Text>
          </Section>

          <Heading as="h2" style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
            Per-Source Results
          </Heading>

          {sourceResults.map((r, i) => (
            <Row key={i} style={{ marginBottom: "8px", padding: "10px", background: "#f9fafb", borderRadius: "6px" }}>
              <Column>
                <Text style={{ margin: 0, fontWeight: "600", fontSize: "13px", color: "#111827" }}>
                  {r.status === "SUCCESS" ? "✓" : r.status === "FAILED" ? "✗" : "~"} {r.dataSource.name}
                </Text>
                <Text style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                  {r.recordsScraped} records scraped
                  {r.durationMs ? ` · ${r.durationMs}ms` : ""}
                </Text>
                {r.errorDetail && (
                  <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#ef4444" }}>
                    Error: {r.errorDetail}
                  </Text>
                )}
              </Column>
            </Row>
          ))}

          <Hr style={{ margin: "20px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
            ElectaBase · Auto-generated refresh summary
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
