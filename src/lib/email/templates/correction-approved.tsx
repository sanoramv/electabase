import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
} from "@react-email/components";

export default function CorrectionApprovedEmail() {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", padding: "20px" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto", backgroundColor: "#fff", borderRadius: "8px", padding: "24px", border: "1px solid #e5e7eb" }}>
          <Heading style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", marginBottom: "4px" }}>
            Correction Approved ✓
          </Heading>
          <Text style={{ color: "#374151", fontSize: "14px" }}>
            A data correction you submitted to ElectaBase has been reviewed and approved.
            The database has been updated to reflect your correction.
          </Text>
          <Text style={{ color: "#374151", fontSize: "14px" }}>
            Thank you for helping keep ElectaBase accurate. Your contribution helps millions of
            voters access reliable political records.
          </Text>
          <Hr style={{ margin: "20px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
            ElectaBase · Per India&apos;s DPDP Act 2023, your email address has been permanently
            anonymised now that this correction has reached a terminal state.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
