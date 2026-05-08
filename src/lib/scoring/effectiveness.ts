import type {
  AttendanceRecord,
  Achievement,
  ParlamentaryTenure,
  Politician,
} from "@prisma/client";

export const ALGORITHM_VERSION = "effectiveness-v1.0";

// Achievement category multipliers
const ACHIEVEMENT_MULTIPLIERS: Record<string, number> = {
  LEGISLATION: 1.5,
  WELFARE: 1.2,
  INFRASTRUCTURE: 1.0,
  INTERNATIONAL: 1.0,
  AWARD: 0.5,
  OTHER: 0.5,
};

function logNorm(x: number, p75: number): number {
  if (p75 <= 0) return 0;
  return Math.min(1.0, Math.log(x + 1) / Math.log(p75 + 1));
}

export interface EffectivenessInput {
  politician: Pick<Politician, "id" | "countryCode" | "dateOfBirth">;
  attendanceRecords: AttendanceRecord[];
  achievements: Achievement[];
  tenures: ParlamentaryTenure[];
  // National p75 benchmarks — computed from all politicians before scoring
  benchmarks: {
    questionsP75: number;
    debatesP75: number;
    privateBillsP75: number;
  };
}

export interface EffectivenessBreakdown {
  attendance: number;
  questions: number;
  debates: number;
  privateBills: number;
  billsParticipation: number;
  achievements: number;
  tenureDuration: number;
  total: number;
  insufficientData: boolean;
}

export function computeEffectivenessScore(
  input: EffectivenessInput
): { score: number; breakdown: EffectivenessBreakdown } {
  const { attendanceRecords, achievements, tenures, benchmarks } = input;

  const insufficientData = attendanceRecords.length === 0;

  // 1. Attendance (20 pts)
  let attendanceScore = 0;
  if (attendanceRecords.length > 0) {
    const avgAttendance =
      attendanceRecords.reduce(
        (sum, r) => sum + Number(r.attendancePercentage),
        0
      ) / attendanceRecords.length;
    attendanceScore = (avgAttendance / 100) * 20;
  }

  // 2. Questions raised (15 pts)
  const totalQuestions = attendanceRecords.reduce(
    (sum, r) => sum + r.questionsRaised,
    0
  );
  const questionsScore = logNorm(totalQuestions, benchmarks.questionsP75) * 15;

  // 3. Debates participated (15 pts)
  const totalDebates = attendanceRecords.reduce(
    (sum, r) => sum + r.debatesParticipated,
    0
  );
  const debatesScore = logNorm(totalDebates, benchmarks.debatesP75) * 15;

  // 4. Private bills introduced (20 pts)
  const totalPrivateBills = attendanceRecords.reduce(
    (sum, r) => sum + r.privateBillsIntroduced,
    0
  );
  const privateBillsScore =
    logNorm(totalPrivateBills, benchmarks.privateBillsP75) * 20;

  // 5. Bills voted on / participation rate (10 pts)
  const totalBillsParticipated = attendanceRecords.reduce(
    (sum, r) => sum + r.billsParticipated,
    0
  );
  const totalSessions = attendanceRecords.reduce(
    (sum, r) => sum + r.totalSessions,
    0
  );
  const participationRate =
    totalSessions > 0 ? totalBillsParticipated / totalSessions : 0;
  const billsParticipationScore = Math.min(participationRate, 1) * 10;

  // 6. Verified achievements (15 pts)
  const verifiedAchievements = achievements.filter((a) => a.isVerified);
  const achievementsRaw = verifiedAchievements.reduce((sum, a) => {
    const multiplier = ACHIEVEMENT_MULTIPLIERS[a.category] ?? 0.5;
    return sum + multiplier;
  }, 0);
  const achievementsScore = Math.min(achievementsRaw, 15);

  // 7. Tenure duration factor (5 pts) — max at 10 years
  const totalTenureYears = tenures.reduce((sum, t) => {
    const end = t.termEndDate ?? new Date();
    const years =
      (end.getTime() - t.termStartDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);
    return sum + years;
  }, 0);
  const tenureScore = Math.min(totalTenureYears / 10, 1) * 5;

  const total = Math.min(
    100,
    attendanceScore +
      questionsScore +
      debatesScore +
      privateBillsScore +
      billsParticipationScore +
      achievementsScore +
      tenureScore
  );

  return {
    score: Math.round(total * 100) / 100,
    breakdown: {
      attendance: Math.round(attendanceScore * 100) / 100,
      questions: Math.round(questionsScore * 100) / 100,
      debates: Math.round(debatesScore * 100) / 100,
      privateBills: Math.round(privateBillsScore * 100) / 100,
      billsParticipation: Math.round(billsParticipationScore * 100) / 100,
      achievements: Math.round(achievementsScore * 100) / 100,
      tenureDuration: Math.round(tenureScore * 100) / 100,
      total: Math.round(total * 100) / 100,
      insufficientData,
    },
  };
}
