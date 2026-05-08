import type { CrimeRecord, CorruptionRecord } from "@prisma/client";

export const ALGORITHM_VERSION = "corruption-v1.0";

// IPC severity tier multipliers (tier stored on CrimeRecord.ipcSeverityTier)
const SEVERITY_MULTIPLIERS: Record<number, number> = {
  1: 3.0, // SEVERE: murder, rape, terrorism, dacoity, POCSO
  2: 2.0, // SERIOUS: corruption, fraud, money laundering, kidnapping, riot
  3: 1.5, // MODERATE: other non-bailable offences
  4: 1.0, // MINOR: bailable offences
};

// Case status modifiers
const STATUS_MODIFIERS: Record<string, number> = {
  CONVICTED: 1.0,
  APPEALING: 0.5,
  PENDING: 0.3,
  ACQUITTED: -0.2,
};

export interface CorruptionInput {
  crimeRecords: CrimeRecord[];
  corruptionRecords: CorruptionRecord[];
  hasAssetDiscrepancy: boolean;
}

export interface CorruptionBreakdown {
  criminalCases: number;
  convictions: number;
  jailTime: number;
  corruptionRecords: number;
  electoralMalpractice: number;
  assetDiscrepancy: number;
  total: number;
}

export function computeCorruptionScore(input: CorruptionInput): {
  score: number;
  breakdown: CorruptionBreakdown;
} {
  const { crimeRecords, corruptionRecords, hasAssetDiscrepancy } = input;

  // Zero-record rule: 0 records → score exactly 0
  if (
    crimeRecords.length === 0 &&
    corruptionRecords.length === 0 &&
    !hasAssetDiscrepancy
  ) {
    return {
      score: 0,
      breakdown: {
        criminalCases: 0,
        convictions: 0,
        jailTime: 0,
        corruptionRecords: 0,
        electoralMalpractice: 0,
        assetDiscrepancy: 0,
        total: 0,
      },
    };
  }

  // 1. Criminal cases by severity (30 pts max)
  const criminalCasesRaw = crimeRecords.reduce((sum, r) => {
    const severity = SEVERITY_MULTIPLIERS[r.ipcSeverityTier ?? 4] ?? 1.0;
    const status = STATUS_MODIFIERS[r.caseStatus] ?? 0;
    const base = 5; // base weight per case
    return sum + base * severity * status;
  }, 0);
  const criminalCasesScore = Math.min(30, Math.max(0, criminalCasesRaw));

  // 2. Conviction weight (25 pts max): convicted cases × 5
  const convictedCount = crimeRecords.filter(
    (r) => r.caseStatus === "CONVICTED"
  ).length;
  const convictionsScore = Math.min(25, convictedCount * 5);

  // 3. Jail time served (15 pts max): max at 3650 days (10 years)
  const totalJailDays = crimeRecords.reduce(
    (sum, r) => sum + (r.jailTimeDays ?? 0),
    0
  );
  const jailTimeScore = Math.min(1, totalJailDays / 3650) * 15;

  // 4. Verified corruption records (15 pts max): count × 3, capped at 15
  const verifiedCorruptionCount = corruptionRecords.filter(
    (r) => r.isVerified
  ).length;
  const corruptionRecordsScore = Math.min(15, verifiedCorruptionCount * 3);

  // 5. Electoral malpractice (10 pts max): electoral category records × 5
  const electoralRecords = corruptionRecords.filter(
    (r) => r.category === "ELECTORAL"
  ).length;
  const electoralMalpracticeScore = Math.min(10, electoralRecords * 5);

  // 6. Asset discrepancy (5 pts): binary
  const assetDiscrepancyScore = hasAssetDiscrepancy ? 5 : 0;

  const total = Math.min(
    100,
    criminalCasesScore +
      convictionsScore +
      jailTimeScore +
      corruptionRecordsScore +
      electoralMalpracticeScore +
      assetDiscrepancyScore
  );

  return {
    score: Math.round(Math.max(0, total) * 100) / 100,
    breakdown: {
      criminalCases: Math.round(criminalCasesScore * 100) / 100,
      convictions: Math.round(convictionsScore * 100) / 100,
      jailTime: Math.round(jailTimeScore * 100) / 100,
      corruptionRecords: Math.round(corruptionRecordsScore * 100) / 100,
      electoralMalpractice: Math.round(electoralMalpracticeScore * 100) / 100,
      assetDiscrepancy: assetDiscrepancyScore,
      total: Math.round(Math.max(0, total) * 100) / 100,
    },
  };
}
