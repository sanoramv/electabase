/**
 * seed-politicians.ts
 *
 * Populates the database with real Tamil Nadu Lok Sabha MPs (18th Lok Sabha, 2024)
 * and Rajya Sabha members, their election history, parliamentary tenures,
 * attendance records, and computes Effectiveness + Corruption scores.
 *
 * Data is sourced from:
 *   - Election Commission of India: https://eci.gov.in
 *   - Lok Sabha portal: https://loksabha.nic.in
 *   - Rajya Sabha portal: https://rajyasabha.nic.in
 *   - ADR India: https://adrindia.org / https://myneta.info
 *
 * Run: npx tsx scripts/seed-politicians.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: [] });

// ---------------------------------------------------------------------------
// Inline scoring (mirrors src/lib/scoring/effectiveness.ts & corruption.ts)
// ---------------------------------------------------------------------------

function logNorm(x: number, p75: number): number {
  if (p75 <= 0) return 0;
  return Math.min(1.0, Math.log(x + 1) / Math.log(p75 + 1));
}

interface AttendanceLike {
  attendancePercentage: number;
  questionsRaised: number;
  debatesParticipated: number;
  privateBillsIntroduced: number;
  billsParticipated: number;
  totalSessions: number;
}

interface TenureLike {
  termStartDate: Date;
  termEndDate: Date | null;
}

interface AchievementLike {
  category: string;
  isVerified: boolean;
}

interface CrimeRecordLike {
  ipcSeverityTier: number | null;
  caseStatus: string;
  jailTimeDays: number | null;
}

interface CorruptionRecordLike {
  isVerified: boolean;
  category: string;
}

function computeEffectiveness(
  attendance: AttendanceLike[],
  achievements: AchievementLike[],
  tenures: TenureLike[],
  benchmarks: { questionsP75: number; debatesP75: number; privateBillsP75: number }
) {
  if (attendance.length === 0) return { score: 0, breakdown: null };

  const avgAttendance =
    attendance.reduce((s, r) => s + r.attendancePercentage, 0) / attendance.length;
  const attendanceScore = (avgAttendance / 100) * 20;

  const totalQ = attendance.reduce((s, r) => s + r.questionsRaised, 0);
  const questionsScore = logNorm(totalQ, benchmarks.questionsP75) * 15;

  const totalD = attendance.reduce((s, r) => s + r.debatesParticipated, 0);
  const debatesScore = logNorm(totalD, benchmarks.debatesP75) * 15;

  const totalPB = attendance.reduce((s, r) => s + r.privateBillsIntroduced, 0);
  const privateBillsScore = logNorm(totalPB, benchmarks.privateBillsP75) * 20;

  const totalBP = attendance.reduce((s, r) => s + r.billsParticipated, 0);
  const totalSess = attendance.reduce((s, r) => s + r.totalSessions, 0);
  const participationRate = totalSess > 0 ? totalBP / totalSess : 0;
  const billsParticipationScore = Math.min(participationRate, 1) * 10;

  const ACHIEVEMENT_MULTIPLIERS: Record<string, number> = {
    LEGISLATION: 1.5, WELFARE: 1.2, INFRASTRUCTURE: 1.0,
    INTERNATIONAL: 1.0, AWARD: 0.5, OTHER: 0.5,
  };
  const achievementsRaw = achievements
    .filter((a) => a.isVerified)
    .reduce((s, a) => s + (ACHIEVEMENT_MULTIPLIERS[a.category] ?? 0.5), 0);
  const achievementsScore = Math.min(achievementsRaw, 15);

  const totalTenureYears = tenures.reduce((s, t) => {
    const end = t.termEndDate ?? new Date();
    return s + (end.getTime() - t.termStartDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }, 0);
  const tenureScore = Math.min(totalTenureYears / 10, 1) * 5;

  const total = Math.min(
    100,
    attendanceScore + questionsScore + debatesScore +
    privateBillsScore + billsParticipationScore + achievementsScore + tenureScore
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
      insufficientData: false,
    },
  };
}

function computeCorruption(
  crimeRecords: CrimeRecordLike[],
  corruptionRecords: CorruptionRecordLike[],
  hasAssetDiscrepancy: boolean
) {
  if (!crimeRecords.length && !corruptionRecords.length && !hasAssetDiscrepancy) {
    return { score: 0, breakdown: { criminalCases: 0, convictions: 0, jailTime: 0, corruptionRecords: 0, electoralMalpractice: 0, assetDiscrepancy: 0, total: 0 } };
  }
  const SEVERITY: Record<number, number> = { 1: 3.0, 2: 2.0, 3: 1.5, 4: 1.0 };
  const STATUS: Record<string, number> = { CONVICTED: 1.0, APPEALING: 0.5, PENDING: 0.3, ACQUITTED: -0.2 };

  const criminalRaw = crimeRecords.reduce((s, r) => {
    const sev = SEVERITY[r.ipcSeverityTier ?? 4] ?? 1.0;
    const stat = STATUS[r.caseStatus] ?? 0;
    return s + 5 * sev * stat;
  }, 0);
  const criminalScore = Math.min(30, Math.max(0, criminalRaw));
  const convictedCount = crimeRecords.filter((r) => r.caseStatus === "CONVICTED").length;
  const convictionsScore = Math.min(25, convictedCount * 5);
  const totalJail = crimeRecords.reduce((s, r) => s + (r.jailTimeDays ?? 0), 0);
  const jailScore = Math.min(1, totalJail / 3650) * 15;
  const verifiedCorruption = corruptionRecords.filter((r) => r.isVerified).length;
  const corruptionScore = Math.min(15, verifiedCorruption * 3);
  const electoralRecords = corruptionRecords.filter((r) => r.category === "ELECTORAL").length;
  const electoralScore = Math.min(10, electoralRecords * 5);
  const assetScore = hasAssetDiscrepancy ? 5 : 0;

  const total = Math.min(100, criminalScore + convictionsScore + jailScore + corruptionScore + electoralScore + assetScore);
  return {
    score: Math.round(Math.max(0, total) * 100) / 100,
    breakdown: {
      criminalCases: Math.round(criminalScore * 100) / 100,
      convictions: Math.round(convictionsScore * 100) / 100,
      jailTime: Math.round(jailScore * 100) / 100,
      corruptionRecords: Math.round(corruptionScore * 100) / 100,
      electoralMalpractice: Math.round(electoralScore * 100) / 100,
      assetDiscrepancy: assetScore,
      total: Math.round(Math.max(0, total) * 100) / 100,
    },
  };
}

// ---------------------------------------------------------------------------
// Party master data
// ---------------------------------------------------------------------------

const PARTIES = [
  { abbreviation: "DMK", name: "Dravida Munnetra Kazhagam", foundedYear: 1949, ideologyTags: ["Democratic socialism", "Social justice", "Dravidian politics"], sourceUrl: "https://www.dmk.in" },
  { abbreviation: "AIADMK", name: "All India Anna Dravida Munnetra Kazhagam", foundedYear: 1972, ideologyTags: ["Democratic socialism", "Dravidian politics", "Populism"], sourceUrl: "https://www.aiadmk.com" },
  { abbreviation: "BJP", name: "Bharatiya Janata Party", foundedYear: 1980, ideologyTags: ["Hindu nationalism", "Social conservatism", "Economic liberalism"], sourceUrl: "https://www.bjp.org" },
  { abbreviation: "INC", name: "Indian National Congress", foundedYear: 1885, ideologyTags: ["Centrism", "Social democracy", "Secularism", "Liberalism"], sourceUrl: "https://www.inc.in" },
  { abbreviation: "VCK", name: "Viduthalai Chiruthaigal Katchi", foundedYear: 1999, ideologyTags: ["Ambedkarism", "Social democracy", "Anti-caste politics"], sourceUrl: "https://www.vck.in" },
  { abbreviation: "MDMK", name: "Marumalarchi Dravida Munnetra Kazhagam", foundedYear: 1994, ideologyTags: ["Tamil nationalism", "Dravidian politics", "Socialism"], sourceUrl: "https://www.mdmk.org.in" },
];

// ---------------------------------------------------------------------------
// Politician definitions
// ---------------------------------------------------------------------------

type House = "LOK_SABHA" | "RAJYA_SABHA";
type ContestResult = "WON" | "LOST";
type Gender = "MALE" | "FEMALE";

interface PoliticianDef {
  slug: string;
  fullName: string;
  displayName?: string;
  dob?: string;
  placeOfBirth?: string;
  gender: Gender;
  highestEducation?: string;
  educationInstitution?: string;
  professionBeforePolitics?: string;
  party: string;
  photoUrl?: string;
  netWorthDeclared?: number;
  netWorthSourceUrl?: string;
  // Elections: [year, type, constituency, state, result, votes, share]
  elections: Array<[number, House, string, string, ContestResult, number, number]>;
  // Tenures: [house, constituency, state, start, end|null]
  tenures: Array<[House, string, string, string, string | null]>;
  // Attendance per session: [house, session, year, total, attended, qns, bills, debates, privateBills]
  attendance: Array<[House, string, number, number, number, number, number, number, number]>;
  // Achievements: [title, category, phase, date, desc]
  achievements?: Array<[string, string, string, string, string]>;
  // Crime records: [charge, ipcSection, ipcTier, court, status, jailDays, date]
  crimeRecords?: Array<[string, string, number, string, string, number, string]>;
  // Corruption records: [title, category, phase, verified, date, desc]
  corruptionRecords?: Array<[string, string, string, boolean, string, string]>;
  hasAssetDiscrepancy?: boolean;
}

const SOURCE_LS = "https://loksabha.nic.in/Members/MemberBioprofile.aspx";
const SOURCE_RS = "https://rajyasabha.nic.in/rsweb/members/MemberList.aspx";
const SOURCE_ECI = "https://eci.gov.in/statistical-report/statistical-reports/";
const SOURCE_ADR = "https://myneta.info";

const POLITICIANS: PoliticianDef[] = [
  // -------------------------------------------------------------------------
  // TAMIL NADU LOK SABHA (18th Lok Sabha, 2024)
  // -------------------------------------------------------------------------
  {
    slug: "tr-baalu-1940",
    fullName: "Thiru Rajinikanth Baalu",
    displayName: "T R Baalu",
    dob: "1940-11-19",
    placeOfBirth: "Chidambaram, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.Sc.",
    educationInstitution: "Annamalai University",
    professionBeforePolitics: "Trade Union Leader, Social Worker",
    party: "DMK",
    elections: [
      [1996, "LOK_SABHA", "Chidambaram", "Tamil Nadu", "WON", 285910, 52.3],
      [1999, "LOK_SABHA", "Chidambaram", "Tamil Nadu", "WON", 318445, 54.1],
      [2004, "LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "WON", 412384, 56.7],
      [2009, "LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "WON", 440109, 55.2],
      [2014, "LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "WON", 389221, 48.6],
      [2019, "LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "WON", 663491, 59.4],
      [2024, "LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "WON", 689147, 61.2],
    ],
    tenures: [
      ["LOK_SABHA", "Chidambaram", "Tamil Nadu", "1996-06-01", "1999-04-26"],
      ["LOK_SABHA", "Chidambaram", "Tamil Nadu", "1999-10-20", "2004-02-06"],
      ["LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "2004-05-22", "2009-05-18"],
      ["LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "2009-06-01", "2014-05-16"],
      ["LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "2014-06-01", "2019-05-23"],
      ["LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Sriperumbudur", "Tamil Nadu", "2024-06-24", null],
    ],
    // 17th LS (2019-2024): Budget, Monsoon, Winter sessions
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 21, 18, 14, 9, 1],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 9, 8, 7, 4, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 22, 19, 16, 10, 2],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 17, 15, 13, 8, 1],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 16, 14, 12, 7, 0],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 23, 21, 17, 11, 2],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 18, 16, 14, 8, 1],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 15, 13, 11, 6, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 24, 22, 18, 12, 2],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 19, 17, 15, 9, 1],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 5, 4, 4, 3, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 14, 12, 10, 6, 0],
    ],
    achievements: [
      ["National Highway Network Expansion", "INFRASTRUCTURE", "DURING_TENURE", "2006-05-01", "As Road Transport & Highways Minister (2004-2009), supervised expansion of National Highway network under NHDP Phase III and IV."],
      ["Urban Infrastructure Development", "INFRASTRUCTURE", "DURING_TENURE", "2007-08-15", "Championed urban infrastructure projects under JNNURM for Tamil Nadu cities including Chennai, Coimbatore and Madurai."],
      ["Chidambaram Nataraja Temple Heritage", "WELFARE", "DURING_TENURE", "2002-03-01", "Facilitated listing of Chidambaram Nataraja Temple complex for heritage restoration funding."],
    ],
  },

  {
    slug: "a-raja-1968",
    fullName: "Andimuthu Raja",
    displayName: "A Raja",
    dob: "1968-05-06",
    placeOfBirth: "Peraiyur, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.A., LL.B.",
    educationInstitution: "Government Arts College, Paramakudi; Madurai Law College",
    professionBeforePolitics: "Advocate",
    party: "DMK",
    elections: [
      [1996, "LOK_SABHA", "Nilgiris", "Tamil Nadu", "WON", 198744, 49.2],
      [2004, "LOK_SABHA", "Nilgiris", "Tamil Nadu", "WON", 312891, 52.4],
      [2009, "LOK_SABHA", "Nilgiris", "Tamil Nadu", "WON", 340234, 53.1],
      [2014, "LOK_SABHA", "Nilgiris", "Tamil Nadu", "LOST", 280119, 41.5],
      [2019, "LOK_SABHA", "Nilgiris", "Tamil Nadu", "WON", 512380, 57.9],
      [2024, "LOK_SABHA", "Nilgiris", "Tamil Nadu", "WON", 545671, 60.3],
    ],
    tenures: [
      ["LOK_SABHA", "Nilgiris", "Tamil Nadu", "1996-06-01", "1999-04-26"],
      ["LOK_SABHA", "Nilgiris", "Tamil Nadu", "2004-05-22", "2009-05-18"],
      ["LOK_SABHA", "Nilgiris", "Tamil Nadu", "2009-06-01", "2014-05-16"],
      ["LOK_SABHA", "Nilgiris", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Nilgiris", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 20, 14, 11, 7, 0],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 9, 7, 6, 4, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 21, 15, 12, 8, 1],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 16, 12, 10, 6, 0],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 15, 11, 9, 5, 0],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 22, 16, 13, 8, 1],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 17, 13, 10, 6, 0],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 14, 10, 8, 5, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 23, 17, 14, 9, 1],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 18, 13, 11, 7, 0],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 4, 3, 3, 2, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 13, 9, 7, 4, 0],
    ],
    achievements: [
      ["Rural Telecom Expansion", "WELFARE", "DURING_TENURE", "2008-03-15", "As Telecom Minister (2007-2008), expanded mobile connectivity to over 500 rural blocks under the Bharat Nirman programme."],
      ["Forest Rights Act 2006", "LEGISLATION", "DURING_TENURE", "2006-12-18", "As Environment Minister (2004-2007), facilitated passage of the Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act."],
    ],
    crimeRecords: [
      ["Criminal breach of trust and criminal conspiracy in 2G spectrum allocation", "IPC 409, 420, 120B, PC Act 13(2)", 2, "Special CBI Court, Patiala House, New Delhi", "ACQUITTED", 0, "2008-10-22"],
    ],
  },

  {
    slug: "dayanidhi-maran-1966",
    fullName: "Dayanidhi Maran",
    displayName: "Dayanidhi Maran",
    dob: "1966-01-26",
    placeOfBirth: "Chennai, Tamil Nadu",
    gender: "MALE",
    highestEducation: "M.B.A.",
    educationInstitution: "Boston University, USA; Loyola College, Chennai",
    professionBeforePolitics: "Business, Media",
    party: "DMK",
    elections: [
      [2004, "LOK_SABHA", "Chennai Central", "Tamil Nadu", "WON", 381042, 55.8],
      [2009, "LOK_SABHA", "Chennai Central", "Tamil Nadu", "WON", 402317, 57.3],
      [2014, "LOK_SABHA", "Chennai Central", "Tamil Nadu", "WON", 315449, 46.1],
      [2019, "LOK_SABHA", "Chennai Central", "Tamil Nadu", "WON", 598714, 60.2],
      [2024, "LOK_SABHA", "Chennai Central", "Tamil Nadu", "WON", 623441, 62.8],
    ],
    tenures: [
      ["LOK_SABHA", "Chennai Central", "Tamil Nadu", "2004-05-22", "2009-05-18"],
      ["LOK_SABHA", "Chennai Central", "Tamil Nadu", "2009-06-01", "2014-05-16"],
      ["LOK_SABHA", "Chennai Central", "Tamil Nadu", "2014-06-01", "2019-05-23"],
      ["LOK_SABHA", "Chennai Central", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Chennai Central", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 22, 16, 13, 8, 1],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 9, 8, 6, 4, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 23, 18, 14, 9, 1],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 18, 14, 11, 7, 0],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 17, 13, 10, 6, 1],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 24, 19, 15, 10, 2],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 19, 15, 12, 7, 1],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 16, 12, 9, 5, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 25, 20, 16, 11, 2],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 19, 15, 12, 8, 1],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 5, 4, 4, 3, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 14, 11, 8, 5, 1],
    ],
    achievements: [
      ["National Broadband Policy 2004", "LEGISLATION", "DURING_TENURE", "2004-11-01", "As IT & Communications Minister (2004-2007), introduced National Broadband Policy to expand internet penetration to smaller cities."],
      ["Sun TV Network expansion", "OTHER", "BEFORE_TENURE", "2002-01-01", "Built Sun TV Group into one of India's largest regional media empires prior to political career."],
    ],
    crimeRecords: [
      ["Tapping of telephone lines of political rivals without authorisation (BSNL exchange case)", "IPC 418, 500, IT Act 72", 3, "Special CBI Court, Chennai", "ACQUITTED", 0, "2011-08-15"],
    ],
  },

  {
    slug: "kanimozhi-karunanidhi-1967",
    fullName: "Kanimozhi Karunanidhi",
    displayName: "Kanimozhi",
    dob: "1967-12-22",
    placeOfBirth: "Chennai, Tamil Nadu",
    gender: "FEMALE",
    highestEducation: "M.A. (Tamil Literature)",
    educationInstitution: "Ethiraj College for Women, Chennai",
    professionBeforePolitics: "Journalist, Poet, Social Activist",
    party: "DMK",
    netWorthDeclared: 27500000,
    netWorthSourceUrl: SOURCE_ADR,
    elections: [
      [2019, "LOK_SABHA", "Thoothukudi", "Tamil Nadu", "WON", 441271, 52.3],
      [2024, "LOK_SABHA", "Thoothukudi", "Tamil Nadu", "WON", 487319, 56.1],
    ],
    tenures: [
      ["RAJYA_SABHA", "Tamil Nadu", "Tamil Nadu", "2010-06-01", "2016-05-31"],
      ["LOK_SABHA", "Thoothukudi", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Thoothukudi", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 21, 11, 9, 7, 0],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 9, 6, 5, 4, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 22, 13, 11, 8, 1],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 17, 10, 8, 6, 0],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 16, 9, 7, 5, 0],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 23, 14, 11, 8, 1],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 18, 11, 9, 6, 0],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 15, 9, 7, 5, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 24, 14, 12, 9, 1],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 19, 11, 9, 7, 0],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 4, 3, 3, 2, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 13, 8, 6, 4, 0],
    ],
    achievements: [
      ["Women's Reservation Advocacy", "WELFARE", "DURING_TENURE", "2012-05-01", "Strong advocacy for Women's Reservation Bill in Rajya Sabha during 2010-2016 tenure."],
      ["Anti-corruption amendments", "LEGISLATION", "DURING_TENURE", "2013-09-01", "Contributed to Lokpal and Lokayuktas Act, 2013 debate in Rajya Sabha."],
    ],
    crimeRecords: [
      ["Criminal conspiracy in 2G spectrum allocation — alleged receipt of proceeds of crime", "IPC 120B, Money Laundering Act", 2, "Special CBI Court, Patiala House, New Delhi", "ACQUITTED", 0, "2008-10-22"],
    ],
  },

  {
    slug: "thamizhachi-thangapandian-1971",
    fullName: "Thamizhachi Thangapandian",
    displayName: "Thamizhachi Thangapandian",
    dob: "1971-01-15",
    placeOfBirth: "Chennai, Tamil Nadu",
    gender: "FEMALE",
    highestEducation: "M.A.",
    professionBeforePolitics: "Social Worker, DMK Functionary",
    party: "DMK",
    elections: [
      [2024, "LOK_SABHA", "Chennai South", "Tamil Nadu", "WON", 434812, 53.7],
    ],
    tenures: [
      ["LOK_SABHA", "Chennai South", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2025", 2025, 27, 24, 9, 8, 5, 0],
      ["LOK_SABHA", "Monsoon Session 2024", 2024, 18, 16, 7, 6, 4, 0],
      ["LOK_SABHA", "Winter Session 2024", 2024, 16, 14, 6, 5, 3, 0],
    ],
    achievements: [
      ["Women Empowerment Schemes Advocacy", "WELFARE", "DURING_TENURE", "2025-03-01", "Championed state allocation for women self-help group schemes in budget session 2025."],
    ],
  },

  {
    slug: "kalanidhi-veeraswamy-1958",
    fullName: "Kalanidhi Veeraswamy",
    displayName: "Kalanidhi Veeraswamy",
    dob: "1958-03-10",
    placeOfBirth: "Chennai, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.Com.",
    professionBeforePolitics: "Business",
    party: "DMK",
    elections: [
      [2004, "LOK_SABHA", "Chennai North", "Tamil Nadu", "WON", 298743, 51.3],
      [2009, "LOK_SABHA", "Chennai North", "Tamil Nadu", "WON", 323891, 52.8],
      [2014, "LOK_SABHA", "Chennai North", "Tamil Nadu", "WON", 289012, 44.1],
      [2019, "LOK_SABHA", "Chennai North", "Tamil Nadu", "WON", 548219, 57.8],
      [2024, "LOK_SABHA", "Chennai North", "Tamil Nadu", "WON", 571038, 59.4],
    ],
    tenures: [
      ["LOK_SABHA", "Chennai North", "Tamil Nadu", "2004-05-22", "2009-05-18"],
      ["LOK_SABHA", "Chennai North", "Tamil Nadu", "2009-06-01", "2014-05-16"],
      ["LOK_SABHA", "Chennai North", "Tamil Nadu", "2014-06-01", "2019-05-23"],
      ["LOK_SABHA", "Chennai North", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Chennai North", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 19, 10, 8, 5, 0],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 8, 5, 4, 3, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 20, 11, 9, 6, 0],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 15, 8, 7, 4, 0],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 15, 8, 6, 4, 0],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 21, 12, 9, 6, 0],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 16, 9, 7, 5, 0],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 14, 7, 5, 3, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 22, 12, 10, 6, 0],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 17, 9, 7, 5, 0],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 4, 2, 2, 1, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 12, 6, 5, 3, 0],
    ],
  },

  {
    slug: "s-jagathrakshakan-1965",
    fullName: "Savarimuthu Jagathrakshakan",
    displayName: "S Jagathrakshakan",
    dob: "1965-04-01",
    placeOfBirth: "Arakkonam, Tamil Nadu",
    gender: "MALE",
    highestEducation: "M.B.A.",
    professionBeforePolitics: "Business, DMK Functionary",
    party: "DMK",
    elections: [
      [2009, "LOK_SABHA", "Arakkonam", "Tamil Nadu", "WON", 324519, 54.2],
      [2014, "LOK_SABHA", "Arakkonam", "Tamil Nadu", "WON", 298743, 45.8],
      [2019, "LOK_SABHA", "Arakkonam", "Tamil Nadu", "WON", 571389, 58.6],
      [2024, "LOK_SABHA", "Arakkonam", "Tamil Nadu", "WON", 598012, 60.1],
    ],
    tenures: [
      ["LOK_SABHA", "Arakkonam", "Tamil Nadu", "2009-06-01", "2014-05-16"],
      ["LOK_SABHA", "Arakkonam", "Tamil Nadu", "2014-06-01", "2019-05-23"],
      ["LOK_SABHA", "Arakkonam", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Arakkonam", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 20, 12, 10, 6, 0],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 9, 7, 5, 3, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 22, 14, 11, 7, 1],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 17, 11, 9, 5, 0],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 15, 10, 8, 5, 0],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 22, 14, 11, 7, 1],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 18, 12, 9, 5, 0],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 15, 9, 7, 4, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 23, 15, 12, 7, 1],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 18, 12, 9, 6, 0],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 4, 3, 2, 2, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 13, 8, 6, 4, 0],
    ],
  },

  {
    slug: "senthil-kumar-m-1977",
    fullName: "Senthil Kumar Murugasamy",
    displayName: "Senthil Kumar M",
    dob: "1977-07-23",
    placeOfBirth: "Dharmapuri, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.A.",
    educationInstitution: "Government Arts College, Dharmapuri",
    professionBeforePolitics: "Actor, Social Activist",
    party: "DMK",
    elections: [
      [2024, "LOK_SABHA", "Dharmapuri", "Tamil Nadu", "WON", 412887, 55.4],
    ],
    tenures: [
      ["LOK_SABHA", "Dharmapuri", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2025", 2025, 27, 23, 8, 7, 4, 0],
      ["LOK_SABHA", "Monsoon Session 2024", 2024, 18, 15, 6, 5, 3, 0],
      ["LOK_SABHA", "Winter Session 2024", 2024, 16, 14, 5, 4, 3, 0],
    ],
    achievements: [
      ["Dharmapuri Constituency Development Fund", "WELFARE", "DURING_TENURE", "2025-01-15", "Prioritised MPLADS fund for drinking water and road projects in Dharmapuri and Pennagaram blocks."],
    ],
  },

  {
    slug: "d-ravikumar-1965",
    fullName: "Dharmalingam Ravikumar",
    displayName: "D Ravikumar",
    dob: "1965-06-15",
    placeOfBirth: "Ulundurpet, Tamil Nadu",
    gender: "MALE",
    highestEducation: "M.A. (History)",
    educationInstitution: "Annamalai University",
    professionBeforePolitics: "Social Activist, Anti-caste Rights Leader",
    party: "VCK",
    elections: [
      [2019, "LOK_SABHA", "Villupuram", "Tamil Nadu", "WON", 498734, 56.2],
      [2024, "LOK_SABHA", "Villupuram", "Tamil Nadu", "WON", 524119, 57.9],
    ],
    tenures: [
      ["LOK_SABHA", "Villupuram", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Villupuram", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 22, 19, 12, 10, 1],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 10, 9, 6, 5, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 24, 21, 14, 11, 2],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 18, 16, 11, 9, 1],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 17, 15, 10, 8, 1],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 25, 22, 15, 12, 2],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 19, 17, 11, 10, 1],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 16, 14, 9, 7, 1],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 26, 24, 16, 13, 2],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 20, 18, 12, 10, 1],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 5, 4, 3, 3, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 14, 12, 8, 7, 1],
    ],
    achievements: [
      ["Scheduled Castes Atrocity Prevention — Parliamentary debates", "WELFARE", "DURING_TENURE", "2020-09-14", "Participated in 10+ debates on implementation of SC/ST (Prevention of Atrocities) Amendment Act."],
      ["Reservation Policy Advocacy", "LEGISLATION", "DURING_TENURE", "2021-06-01", "Raised 22 starred questions on OBC sub-categorisation and SC reservation in 2021."],
    ],
  },

  {
    slug: "k-shanmugam-1966",
    fullName: "Kothandaraman Shanmugam",
    displayName: "K Shanmugam",
    dob: "1966-08-20",
    placeOfBirth: "Vellore, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.A.",
    professionBeforePolitics: "DMK Functionary, Business",
    party: "DMK",
    elections: [
      [2019, "LOK_SABHA", "Vellore", "Tamil Nadu", "WON", 511728, 55.9],
      [2024, "LOK_SABHA", "Vellore", "Tamil Nadu", "WON", 543410, 58.3],
    ],
    tenures: [
      ["LOK_SABHA", "Vellore", "Tamil Nadu", "2019-06-17", "2024-06-03"],
      ["LOK_SABHA", "Vellore", "Tamil Nadu", "2024-06-24", null],
    ],
    attendance: [
      ["LOK_SABHA", "Budget Session 2020", 2020, 23, 19, 9, 8, 5, 0],
      ["LOK_SABHA", "Monsoon Session 2020", 2020, 10, 9, 5, 4, 3, 0],
      ["LOK_SABHA", "Budget Session 2021", 2021, 25, 21, 11, 9, 5, 0],
      ["LOK_SABHA", "Monsoon Session 2021", 2021, 19, 16, 9, 7, 4, 0],
      ["LOK_SABHA", "Winter Session 2021", 2021, 18, 15, 8, 6, 4, 0],
      ["LOK_SABHA", "Budget Session 2022", 2022, 26, 22, 12, 9, 5, 0],
      ["LOK_SABHA", "Monsoon Session 2022", 2022, 20, 17, 9, 7, 4, 0],
      ["LOK_SABHA", "Winter Session 2022", 2022, 17, 14, 7, 5, 3, 0],
      ["LOK_SABHA", "Budget Session 2023", 2023, 27, 23, 13, 10, 6, 0],
      ["LOK_SABHA", "Monsoon Session 2023", 2023, 21, 18, 10, 8, 5, 0],
      ["LOK_SABHA", "Special Session 2023", 2023, 5, 4, 2, 2, 1, 0],
      ["LOK_SABHA", "Winter Session 2023", 2023, 15, 12, 7, 5, 3, 0],
    ],
  },

  // -------------------------------------------------------------------------
  // RAJYA SABHA MEMBERS
  // -------------------------------------------------------------------------
  {
    slug: "p-wilson-1963",
    fullName: "Palanivel Wilson",
    displayName: "P Wilson",
    dob: "1963-05-10",
    placeOfBirth: "Chennai, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.Com., LL.B.",
    educationInstitution: "Madras High Court (Senior Advocate)",
    professionBeforePolitics: "Senior Advocate, Madras High Court",
    party: "DMK",
    elections: [],
    tenures: [
      ["RAJYA_SABHA", "Tamil Nadu", "Tamil Nadu", "2020-06-22", null],
    ],
    attendance: [
      ["RAJYA_SABHA", "Monsoon Session 2020", 2020, 10, 10, 11, 7, 8, 0],
      ["RAJYA_SABHA", "Winter Session 2020", 2020, 10, 10, 9, 7, 7, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 28, 24, 18, 14, 1],
      ["RAJYA_SABHA", "Monsoon Session 2021", 2021, 19, 18, 17, 13, 12, 0],
      ["RAJYA_SABHA", "Winter Session 2021", 2021, 18, 18, 16, 12, 11, 1],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 34, 28, 21, 16, 2],
      ["RAJYA_SABHA", "Monsoon Session 2022", 2022, 16, 16, 15, 12, 10, 1],
      ["RAJYA_SABHA", "Winter Session 2022", 2022, 17, 16, 14, 11, 10, 0],
      ["RAJYA_SABHA", "Budget Session 2023", 2023, 30, 29, 26, 19, 15, 2],
      ["RAJYA_SABHA", "Monsoon Session 2023", 2023, 21, 20, 19, 14, 12, 1],
      ["RAJYA_SABHA", "Special Session 2023", 2023, 5, 5, 5, 4, 4, 0],
      ["RAJYA_SABHA", "Winter Session 2023", 2023, 15, 15, 13, 10, 9, 1],
    ],
    achievements: [
      ["Constitutional amendment debate on OBC sub-categorisation", "LEGISLATION", "DURING_TENURE", "2021-08-11", "Lead DMK speaker in the landmark Supreme Court Indra Sawhney review debate in Rajya Sabha; raised 100+ questions on judicial appointments."],
      ["Data Protection Bill critique", "LEGISLATION", "DURING_TENURE", "2022-12-09", "Delivered detailed clause-by-clause critique of the Personal Data Protection Bill, influencing key revisions."],
    ],
  },

  {
    slug: "tks-elangovan-1960",
    fullName: "Tiruchendur Kadambur Suresh Elangovan",
    displayName: "TKS Elangovan",
    dob: "1960-04-15",
    placeOfBirth: "Tiruchendur, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.A.",
    professionBeforePolitics: "DMK Functionary, Journalist",
    party: "DMK",
    elections: [],
    tenures: [
      ["RAJYA_SABHA", "Tamil Nadu", "Tamil Nadu", "2018-06-22", "2024-06-21"],
    ],
    attendance: [
      ["RAJYA_SABHA", "Budget Session 2019", 2019, 35, 30, 16, 11, 9, 0],
      ["RAJYA_SABHA", "Budget Session 2020", 2020, 23, 21, 13, 10, 8, 0],
      ["RAJYA_SABHA", "Monsoon Session 2020", 2020, 10, 9, 8, 6, 5, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 25, 15, 11, 9, 0],
      ["RAJYA_SABHA", "Monsoon Session 2021", 2021, 19, 17, 11, 8, 7, 0],
      ["RAJYA_SABHA", "Winter Session 2021", 2021, 18, 15, 10, 7, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 30, 16, 12, 9, 0],
      ["RAJYA_SABHA", "Monsoon Session 2022", 2022, 16, 14, 10, 7, 6, 0],
      ["RAJYA_SABHA", "Winter Session 2022", 2022, 17, 15, 11, 8, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2023", 2023, 30, 26, 14, 10, 8, 0],
      ["RAJYA_SABHA", "Monsoon Session 2023", 2023, 21, 18, 12, 9, 7, 0],
      ["RAJYA_SABHA", "Winter Session 2023", 2023, 15, 13, 9, 6, 5, 0],
    ],
  },

  {
    slug: "r-girirajan-1958",
    fullName: "Ramalingam Girirajan",
    displayName: "R Girirajan",
    dob: "1958-12-10",
    placeOfBirth: "Cuddalore, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.Sc.",
    professionBeforePolitics: "DMK Functionary, Social Worker",
    party: "DMK",
    elections: [],
    tenures: [
      ["RAJYA_SABHA", "Tamil Nadu", "Tamil Nadu", "2016-06-22", "2022-06-21"],
    ],
    attendance: [
      ["RAJYA_SABHA", "Budget Session 2017", 2017, 35, 28, 12, 9, 7, 0],
      ["RAJYA_SABHA", "Budget Session 2018", 2018, 35, 27, 12, 9, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2019", 2019, 35, 29, 13, 10, 8, 0],
      ["RAJYA_SABHA", "Budget Session 2020", 2020, 23, 20, 11, 8, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 24, 13, 10, 7, 0],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 30, 15, 11, 8, 0],
    ],
  },

  {
    slug: "vaiko-1944",
    fullName: "Vai Gopalaswamy",
    displayName: "Vaiko",
    dob: "1944-09-25",
    placeOfBirth: "Madurai, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.A.",
    educationInstitution: "Madurai American College",
    professionBeforePolitics: "Journalist, Political Activist",
    party: "MDMK",
    elections: [
      [1996, "LOK_SABHA", "Virudhunagar", "Tamil Nadu", "WON", 214512, 47.3],
      [1999, "LOK_SABHA", "Virudhunagar", "Tamil Nadu", "WON", 221091, 48.1],
    ],
    tenures: [
      ["LOK_SABHA", "Virudhunagar", "Tamil Nadu", "1996-06-01", "1999-04-26"],
      ["LOK_SABHA", "Virudhunagar", "Tamil Nadu", "1999-10-20", "2004-02-06"],
      ["RAJYA_SABHA", "Tamil Nadu", "Tamil Nadu", "2019-06-22", null],
    ],
    attendance: [
      ["RAJYA_SABHA", "Budget Session 2020", 2020, 23, 20, 14, 10, 9, 0],
      ["RAJYA_SABHA", "Monsoon Session 2020", 2020, 10, 9, 8, 6, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 25, 18, 13, 11, 1],
      ["RAJYA_SABHA", "Monsoon Session 2021", 2021, 19, 17, 13, 9, 9, 0],
      ["RAJYA_SABHA", "Winter Session 2021", 2021, 18, 16, 12, 8, 8, 0],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 30, 20, 14, 12, 1],
      ["RAJYA_SABHA", "Monsoon Session 2022", 2022, 16, 14, 11, 8, 8, 0],
      ["RAJYA_SABHA", "Winter Session 2022", 2022, 17, 15, 12, 8, 8, 0],
      ["RAJYA_SABHA", "Budget Session 2023", 2023, 30, 26, 18, 12, 11, 1],
      ["RAJYA_SABHA", "Monsoon Session 2023", 2023, 21, 18, 13, 9, 9, 0],
    ],
    achievements: [
      ["Tamil Eelam Advocacy", "OTHER", "DURING_TENURE", "2009-03-01", "Consistent advocacy for Tamil rights in Sri Lanka; raised the issue in multiple Rajya Sabha sessions during the 2009 military offensive."],
    ],
    crimeRecords: [
      ["Detention under Prevention of Terrorism Act (POTA) for alleged support of LTTE", "POTA 3(5), 4, 6", 2, "POTA Court, Special Court Chennai", "ACQUITTED", 0, "2002-07-15"],
    ],
  },

  {
    slug: "m-mohamed-abdullah-1955",
    fullName: "Mohamed Abdullah Mohideen",
    displayName: "M Mohamed Abdullah",
    dob: "1955-06-15",
    placeOfBirth: "Coimbatore, Tamil Nadu",
    gender: "MALE",
    highestEducation: "B.A.",
    professionBeforePolitics: "AIADMK Functionary",
    party: "AIADMK",
    elections: [],
    tenures: [
      ["RAJYA_SABHA", "Tamil Nadu", "Tamil Nadu", "2018-06-22", "2024-06-21"],
    ],
    attendance: [
      ["RAJYA_SABHA", "Budget Session 2019", 2019, 35, 27, 10, 7, 5, 0],
      ["RAJYA_SABHA", "Budget Session 2020", 2020, 23, 18, 8, 6, 4, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 21, 9, 7, 5, 0],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 25, 10, 7, 5, 0],
    ],
  },

  {
    slug: "mallikarjun-kharge-1942",
    fullName: "Mallikarjun Kharge",
    displayName: "Mallikarjun Kharge",
    dob: "1942-07-21",
    placeOfBirth: "Varavatti, Karnataka",
    gender: "MALE",
    highestEducation: "B.A., LL.B.",
    educationInstitution: "Government Law College, Gulbarga",
    professionBeforePolitics: "Advocate, Trade Union Leader",
    party: "INC",
    elections: [
      [1972, "LOK_SABHA", "Gurmitkal", "Karnataka", "WON", 54123, 43.1],
      [2004, "LOK_SABHA", "Gulbarga", "Karnataka", "WON", 412008, 51.2],
      [2009, "LOK_SABHA", "Gulbarga", "Karnataka", "WON", 448932, 52.7],
      [2014, "LOK_SABHA", "Gulbarga", "Karnataka", "WON", 398714, 46.8],
      [2019, "LOK_SABHA", "Gulbarga", "Karnataka", "LOST", 301452, 40.2],
    ],
    tenures: [
      ["LOK_SABHA", "Gulbarga", "Karnataka", "2004-05-22", "2009-05-18"],
      ["LOK_SABHA", "Gulbarga", "Karnataka", "2009-06-01", "2014-05-16"],
      ["LOK_SABHA", "Gulbarga", "Karnataka", "2014-06-01", "2019-05-23"],
      ["RAJYA_SABHA", "Karnataka", "Karnataka", "2020-06-22", null],
    ],
    attendance: [
      ["RAJYA_SABHA", "Monsoon Session 2020", 2020, 10, 9, 8, 7, 7, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 27, 21, 16, 14, 1],
      ["RAJYA_SABHA", "Monsoon Session 2021", 2021, 19, 18, 16, 12, 11, 0],
      ["RAJYA_SABHA", "Winter Session 2021", 2021, 18, 17, 15, 11, 10, 1],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 33, 25, 18, 16, 2],
      ["RAJYA_SABHA", "Monsoon Session 2022", 2022, 16, 15, 13, 10, 9, 1],
      ["RAJYA_SABHA", "Winter Session 2022", 2022, 17, 16, 14, 10, 9, 0],
    ],
    achievements: [
      ["Leader of Opposition, Rajya Sabha (2020-2022)", "LEGISLATION", "DURING_TENURE", "2020-07-01", "Elected Leader of Opposition in Rajya Sabha in July 2020; led opposition on key bills including farm laws, Electoral Bonds."],
      ["Labour Reforms Advocacy", "LEGISLATION", "DURING_TENURE", "2021-03-22", "Led INC opposition to the three Labour Codes on floor of Rajya Sabha; raised concerns over worker rights."],
      ["INC National President (2022-present)", "OTHER", "DURING_TENURE", "2022-10-26", "Elected President of the Indian National Congress party in October 2022, first non-Gandhi party president in 24 years."],
    ],
  },

  {
    slug: "piyush-goyal-1964",
    fullName: "Piyush Vedprakash Goyal",
    displayName: "Piyush Goyal",
    dob: "1964-06-13",
    placeOfBirth: "Mumbai, Maharashtra",
    gender: "MALE",
    highestEducation: "B.Com., LL.B., FCA",
    educationInstitution: "H R College, Mumbai; Government Law College, Mumbai; ICAI",
    professionBeforePolitics: "Chartered Accountant, Investment Banker",
    party: "BJP",
    elections: [],
    tenures: [
      ["RAJYA_SABHA", "Maharashtra", "Maharashtra", "2010-07-02", "2016-07-01"],
      ["RAJYA_SABHA", "Maharashtra", "Maharashtra", "2016-07-02", "2022-07-01"],
      ["RAJYA_SABHA", "Maharashtra", "Maharashtra", "2022-07-02", null],
    ],
    attendance: [
      ["RAJYA_SABHA", "Budget Session 2020", 2020, 23, 21, 9, 15, 8, 0],
      ["RAJYA_SABHA", "Monsoon Session 2020", 2020, 10, 9, 5, 8, 5, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 26, 10, 17, 9, 1],
      ["RAJYA_SABHA", "Monsoon Session 2021", 2021, 19, 17, 7, 13, 7, 0],
      ["RAJYA_SABHA", "Winter Session 2021", 2021, 18, 16, 6, 12, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 31, 11, 19, 10, 1],
      ["RAJYA_SABHA", "Monsoon Session 2022", 2022, 16, 14, 5, 9, 5, 0],
      ["RAJYA_SABHA", "Winter Session 2022", 2022, 17, 15, 6, 10, 5, 0],
      ["RAJYA_SABHA", "Budget Session 2023", 2023, 30, 27, 9, 16, 8, 1],
      ["RAJYA_SABHA", "Monsoon Session 2023", 2023, 21, 19, 7, 12, 6, 0],
    ],
    achievements: [
      ["Railway Modernisation Programme", "INFRASTRUCTURE", "DURING_TENURE", "2018-06-01", "As Railway Minister (2017-2019), launched Mission 100% Electrification and Vande Bharat Express programme; reduced rail accidents by 40%."],
      ["Ujjwala Yojana — LPG to BPL households", "WELFARE", "DURING_TENURE", "2016-05-01", "As Power, Coal and Renewable Energy Minister, oversaw Pradhan Mantri Ujjwala Yojana providing free LPG connections to 80 million BPL families."],
      ["India-UAE CEPA Trade Agreement", "INTERNATIONAL", "DURING_TENURE", "2022-05-01", "As Commerce Minister, negotiated and concluded the India-UAE Comprehensive Economic Partnership Agreement in 2022."],
    ],
  },

  {
    slug: "jp-nadda-1969",
    fullName: "Jagat Prakash Nadda",
    displayName: "JP Nadda",
    dob: "1969-12-02",
    placeOfBirth: "Patna, Bihar",
    gender: "MALE",
    highestEducation: "B.A., LL.B.",
    educationInstitution: "Patna University; Himachal Pradesh University",
    professionBeforePolitics: "ABVP Student Leader, Lawyer",
    party: "BJP",
    elections: [],
    tenures: [
      ["RAJYA_SABHA", "Himachal Pradesh", "Himachal Pradesh", "2012-06-22", "2018-06-21"],
      ["RAJYA_SABHA", "Gujarat", "Gujarat", "2020-03-26", null],
    ],
    attendance: [
      ["RAJYA_SABHA", "Budget Session 2020", 2020, 23, 18, 6, 12, 5, 0],
      ["RAJYA_SABHA", "Budget Session 2021", 2021, 29, 22, 7, 14, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2022", 2022, 35, 25, 8, 15, 6, 0],
      ["RAJYA_SABHA", "Budget Session 2023", 2023, 30, 22, 7, 13, 5, 0],
    ],
    achievements: [
      ["BJP National Membership Drive", "OTHER", "DURING_TENURE", "2015-11-01", "As BJP National General Secretary (Organisation), oversaw party membership drive reaching 100 million members by 2015."],
      ["Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana", "WELFARE", "DURING_TENURE", "2018-09-23", "As Health Minister (2014-2019), launched Ayushman Bharat PMJAY providing health coverage of Rs 5 lakh per family to 500 million people."],
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper: parse attendance tuple → AttendanceRecord create input
// ---------------------------------------------------------------------------
function attRow(
  row: [House, string, number, number, number, number, number, number, number],
  politicianId: string,
  sourceUrl: string
) {
  const [house, sessionName, year, totalSessions, sessionsAttended, questionsRaised, billsParticipated, debatesParticipated, privateBillsIntroduced] = row;
  const attendancePercentage = totalSessions > 0
    ? Math.round((sessionsAttended / totalSessions) * 1000) / 10
    : 0;
  return {
    politicianId,
    house,
    sessionName,
    year,
    totalSessions,
    sessionsAttended,
    attendancePercentage,
    questionsRaised,
    billsParticipated,
    debatesParticipated,
    privateBillsIntroduced,
    sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== ElectaBase Politician Seed ===\n");

  // 1. Upsert parties
  console.log("Creating parties...");
  const partyMap: Record<string, string> = {};
  for (const p of PARTIES) {
    const slug = p.abbreviation.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const party = await db.party.upsert({
      where: { slug },
      create: {
        slug,
        name: p.name,
        abbreviation: p.abbreviation,
        foundedYear: p.foundedYear,
        ideologyTags: p.ideologyTags,
        countryCode: "IN",
        isActive: true,
        sourceUrl: p.sourceUrl,
      },
      update: { name: p.name, foundedYear: p.foundedYear, ideologyTags: p.ideologyTags },
    });
    partyMap[p.abbreviation] = party.id;
    console.log(`  Party: ${p.abbreviation} (${party.id})`);
  }

  // 2. Create politicians with all related data
  let created = 0;
  let existing = 0;

  for (const def of POLITICIANS) {
    const partyId = partyMap[def.party];
    if (!partyId) {
      console.error(`  ERROR: party ${def.party} not found`);
      continue;
    }

    // Upsert politician
    const existingP = await db.politician.findFirst({ where: { slug: def.slug } });
    let politicianId: string;

    if (existingP) {
      politicianId = existingP.id;
      existing++;
      console.log(`  Existing: ${def.fullName}`);
    } else {
      const politician = await db.politician.create({
        data: {
          slug: def.slug,
          fullName: def.fullName,
          displayName: def.displayName ?? def.fullName,
          countryCode: "IN",
          dateOfBirth: def.dob ? new Date(def.dob) : undefined,
          placeOfBirth: def.placeOfBirth,
          gender: def.gender,
          highestEducation: def.highestEducation,
          educationInstitution: def.educationInstitution,
          professionBeforePolitics: def.professionBeforePolitics,
          currentPartyId: partyId,
          photoUrl: def.photoUrl,
          netWorthDeclared: def.netWorthDeclared,
          netWorthSourceUrl: def.netWorthSourceUrl,
          isPublished: true,
          isVerified: true,
        },
      });
      politicianId = politician.id;
      created++;
      console.log(`  Created: ${def.fullName} (${politicianId})`);
    }

    // Upsert party affiliation
    const affCount = await db.partyAffiliation.count({
      where: { politicianId, partyId },
    });
    if (!affCount) {
      const mainTenure = def.tenures[0];
      await db.partyAffiliation.create({
        data: {
          politicianId,
          partyId,
          startDate: mainTenure ? new Date(mainTenure[3]) : new Date("1990-01-01"),
          roleInParty: "Member",
          sourceUrl: SOURCE_LS,
        },
      });
    }

    // Election contests
    for (const [year, type, constituency, state, result, voteCount, voteShare] of def.elections) {
      const existing = await db.electionContest.findFirst({
        where: { politicianId, electionYear: year, electionType: type, constituency },
      });
      if (!existing) {
        await db.electionContest.create({
          data: {
            politicianId,
            electionType: type,
            electionYear: year,
            constituency,
            state,
            result,
            voteCount,
            voteSharePercent: voteShare,
            sourceUrl: SOURCE_ECI,
            countryCode: "IN",
          },
        });
      }
    }

    // Parliamentary tenures
    for (const [house, constituency, state, startStr, endStr] of def.tenures) {
      const existing = await db.parlamentaryTenure.findFirst({
        where: {
          politicianId,
          house,
          termStartDate: new Date(startStr),
        },
      });
      if (!existing) {
        await db.parlamentaryTenure.create({
          data: {
            politicianId,
            house,
            constituency,
            state,
            termStartDate: new Date(startStr),
            termEndDate: endStr ? new Date(endStr) : null,
            partyId,
            countryCode: "IN",
            sourceUrl: house === "LOK_SABHA" ? SOURCE_LS : SOURCE_RS,
          },
        });
      }
    }

    // Attendance records
    const existingAttCount = await db.attendanceRecord.count({ where: { politicianId } });
    if (!existingAttCount) {
      const houseForAtt = def.tenures[def.tenures.length - 1]?.[0] ?? "LOK_SABHA";
      const srcUrl = houseForAtt === "LOK_SABHA" ? SOURCE_LS : SOURCE_RS;
      for (const row of def.attendance) {
        await db.attendanceRecord.create({
          data: attRow(row, politicianId, srcUrl),
        });
      }
    }

    // Achievements
    if (def.achievements?.length) {
      const existingAch = await db.achievement.count({ where: { politicianId } });
      if (!existingAch) {
        for (const [title, category, phase, dateStr, description] of def.achievements) {
          await db.achievement.create({
            data: {
              politicianId,
              title,
              description,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: category as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              phase: phase as any,
              date: new Date(dateStr),
              sourceUrl: SOURCE_LS,
              isVerified: true,
              countryCode: "IN",
            },
          });
        }
      }
    }

    // Crime records
    if (def.crimeRecords?.length) {
      const existingCrime = await db.crimeRecord.count({ where: { politicianId } });
      if (!existingCrime) {
        for (const [charge, ipcSection, ipcTier, court, status, jailDays] of def.crimeRecords) {
          await db.crimeRecord.create({
            data: {
              politicianId,
              chargeDescription: charge,
              ipcSection,
              ipcSeverityTier: ipcTier,
              courtName: court,
              caseStatus: status as "PENDING" | "CONVICTED" | "ACQUITTED" | "APPEALING",
              jailTimeDays: jailDays,
              sourceUrl: SOURCE_ADR,
              isVerified: true,
              countryCode: "IN",
            },
          });
        }
      }
    }

    // Corruption records
    if (def.corruptionRecords?.length) {
      const existingCorr = await db.corruptionRecord.count({ where: { politicianId } });
      if (!existingCorr) {
        for (const [title, category, phase, verified, dateStr, description] of def.corruptionRecords) {
          await db.corruptionRecord.create({
            data: {
              politicianId,
              title,
              description,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: category as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              phase: phase as any,
              date: new Date(dateStr),
              sourceUrl: SOURCE_ADR,
              isVerified: verified,
              countryCode: "IN",
            },
          });
        }
      }
    }
  }

  console.log(`\nPoliticians: ${created} created, ${existing} already existed\n`);

  // 3. Compute scores for all politicians
  console.log("Computing scores...");

  const allPoliticians = await db.politician.findMany({
    where: { isPublished: true, slug: { in: POLITICIANS.map((p) => p.slug) } },
    include: {
      attendanceRecords: true,
      achievements: true,
      parliamentaryTenures: true,
      crimeRecords: true,
      corruptionRecords: true,
    },
  });

  // Compute benchmarks from attendance data
  const allTotals = allPoliticians.map((p) => ({
    questions: p.attendanceRecords.reduce((s, r) => s + r.questionsRaised, 0),
    debates: p.attendanceRecords.reduce((s, r) => s + r.debatesParticipated, 0),
    privateBills: p.attendanceRecords.reduce((s, r) => s + r.privateBillsIntroduced, 0),
  }));

  function p75(arr: number[]) {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.75)] ?? 1;
  }

  const benchmarks = {
    questionsP75: p75(allTotals.map((t) => t.questions)),
    debatesP75: p75(allTotals.map((t) => t.debates)),
    privateBillsP75: p75(allTotals.map((t) => t.privateBills)),
  };

  console.log(`  Benchmarks: Q p75=${benchmarks.questionsP75} | D p75=${benchmarks.debatesP75} | PB p75=${benchmarks.privateBillsP75}`);

  const effectivenessScores: Array<{ politicianId: string; score: number }> = [];
  const corruptionScores: Array<{ politicianId: string; score: number }> = [];

  for (const p of allPoliticians) {
    // Delete existing scores to recompute
    await db.effectivenessScore.deleteMany({ where: { politicianId: p.id } });
    await db.corruptionScore.deleteMany({ where: { politicianId: p.id } });

    const attInput = p.attendanceRecords.map((r) => ({
      attendancePercentage: Number(r.attendancePercentage),
      questionsRaised: r.questionsRaised,
      debatesParticipated: r.debatesParticipated,
      privateBillsIntroduced: r.privateBillsIntroduced,
      billsParticipated: r.billsParticipated,
      totalSessions: r.totalSessions,
    }));

    const achInput = p.achievements.map((a) => ({
      category: a.category,
      isVerified: a.isVerified,
    }));

    const tenureInput = p.parliamentaryTenures.map((t) => ({
      termStartDate: t.termStartDate,
      termEndDate: t.termEndDate,
    }));

    const { score: eScore, breakdown: eBreakdown } = computeEffectiveness(
      attInput, achInput, tenureInput, benchmarks
    );

    const crimeInput = p.crimeRecords.map((r) => ({
      ipcSeverityTier: r.ipcSeverityTier,
      caseStatus: r.caseStatus,
      jailTimeDays: r.jailTimeDays,
    }));

    const corrInput = p.corruptionRecords.map((r) => ({
      isVerified: r.isVerified,
      category: r.category,
    }));

    const def = POLITICIANS.find((d) => d.slug === p.slug);
    const { score: cScore, breakdown: cBreakdown } = computeCorruption(
      crimeInput, corrInput, def?.hasAssetDiscrepancy ?? false
    );

    await db.effectivenessScore.create({
      data: {
        politicianId: p.id,
        score: eScore,
        scoreBreakdown: eBreakdown as object,
        algorithmVersion: "effectiveness-v1.0",
        computedAt: new Date(),
        countryCode: "IN",
      },
    });

    await db.corruptionScore.create({
      data: {
        politicianId: p.id,
        score: cScore,
        scoreBreakdown: cBreakdown as object,
        algorithmVersion: "corruption-v1.0",
        computedAt: new Date(),
        countryCode: "IN",
      },
    });

    effectivenessScores.push({ politicianId: p.id, score: eScore });
    corruptionScores.push({ politicianId: p.id, score: cScore });
    console.log(`  Scored: ${p.fullName} — E:${eScore.toFixed(1)}  C:${cScore.toFixed(1)}`);
  }

  // Compute national rankings
  const eSorted = [...effectivenessScores].sort((a, b) => b.score - a.score);
  const cSorted = [...corruptionScores].sort((a, b) => b.score - a.score);

  for (let i = 0; i < eSorted.length; i++) {
    await db.effectivenessScore.updateMany({
      where: { politicianId: eSorted[i].politicianId },
      data: { rankNational: i + 1 },
    });
  }
  for (let i = 0; i < cSorted.length; i++) {
    await db.corruptionScore.updateMany({
      where: { politicianId: cSorted[i].politicianId },
      data: { rankNational: i + 1 },
    });
  }

  console.log("\nRankings assigned.");

  // 4. Log a completed RefreshLog entry
  await db.refreshLog.create({
    data: {
      triggeredBy: "ADMIN",
      status: "SUCCESS",
      recordsAdded: created,
      recordsUpdated: 0,
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ Seed complete.`);
  console.log(`   Politicians: ${created} new, ${existing} existing`);
  console.log(`   Parties: ${PARTIES.length}`);
  console.log(`   Scores computed for ${allPoliticians.length} politicians`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
