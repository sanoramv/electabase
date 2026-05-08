/**
 * Additional seed script — adds more politicians to expand the demo dataset.
 * Covers remaining Tamil Nadu 2024 LS seats + key national RS members.
 * Run with: npx tsx scripts/seed-additional.ts
 */

import { PrismaClient, ElectionType, ElectionResult, House, RecordPhase } from "@prisma/client";
import * as crypto from "crypto";

const db = new PrismaClient({ log: [] });

function makeSlug(name: string, year: number): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-") +
    "-" +
    year
  );
}

function computeEffectivenessScore(params: {
  attendancePct: number;
  questionsPerYear: number;
  debatesPerYear: number;
  privateBills: number;
  achievements: number;
  tenureYears: number;
}): number {
  const {
    attendancePct,
    questionsPerYear,
    debatesPerYear,
    privateBills,
    achievements,
    tenureYears,
  } = params;

  const w = {
    attendance: 0.25,
    questions: 0.20,
    debates: 0.20,
    bills: 0.15,
    achievements: 0.15,
    tenure: 0.05,
  };

  const safeLog = (x: number) => (x > 0 ? Math.log(x + 1) : 0);

  const attScore = Math.min(attendancePct / 100, 1) * 100;
  const qScore = Math.min(safeLog(questionsPerYear) / safeLog(51), 1) * 100;
  const dScore = Math.min(safeLog(debatesPerYear) / safeLog(21), 1) * 100;
  const bScore = Math.min(safeLog(privateBills) / safeLog(5), 1) * 100;
  const aScore = Math.min(safeLog(achievements) / safeLog(6), 1) * 100;
  const tScore = Math.min(tenureYears / 25, 1) * 100;

  const raw =
    attScore * w.attendance +
    qScore * w.questions +
    dScore * w.debates +
    bScore * w.bills +
    aScore * w.achievements +
    tScore * w.tenure;

  return Math.round(raw * 10) / 10;
}

async function upsertParty(data: {
  slug: string;
  name: string;
  abbreviation: string;
  foundedYear: number;
  ideologyTags: string[];
}) {
  return db.party.upsert({
    where: { slug: data.slug },
    create: {
      id: data.slug,
      slug: data.slug,
      name: data.name,
      abbreviation: data.abbreviation,
      foundedYear: data.foundedYear,
      ideologyTags: data.ideologyTags,
      countryCode: "IN",
      isActive: true,
      sourceUrl: "https://eci.gov.in",
    },
    update: {},
  });
}

interface PoliticianSeed {
  fullName: string;
  displayName: string;
  slug: string;
  dob: Date;
  placeOfBirth: string;
  gender: string;
  education: string;
  partySlug: string;
  house: House;
  state: string;
  constituency: string;
  tenureStart: Date;
  tenureEnd: Date | null;
  electionYear: number;
  electionResult: ElectionResult;
  voteSharePercent: number;
  attendancePct: number;
  questionsRaised: number;
  debatesParticipated: number;
  privateBillsIntroduced: number;
  achievements?: number;
  sourceUrl: string;
}

async function seedPolitician(p: PoliticianSeed, partyId: string) {
  // Check if already exists
  const existing = await db.politician.findUnique({ where: { slug: p.slug } });
  if (existing) {
    console.log(`  Skipping ${p.fullName} (already exists)`);
    return;
  }

  const politician = await db.politician.create({
    data: {
      slug: p.slug,
      fullName: p.fullName,
      displayName: p.displayName,
      dateOfBirth: p.dob,
      placeOfBirth: p.placeOfBirth,
      gender: p.gender,
      highestEducation: p.education,
      countryCode: "IN",
      currentPartyId: partyId,
      isPublished: true,
    },
  });

  // Party affiliation
  await db.partyAffiliation.create({
    data: {
      politicianId: politician.id,
      partyId,
      startDate: p.tenureStart,
      endDate: null,
      roleInParty: "Member",
      sourceUrl: p.sourceUrl,
    },
  });

  // Parliamentary tenure
  await db.parlamentaryTenure.create({
    data: {
      politicianId: politician.id,
      house: p.house,
      constituency: p.constituency,
      state: p.state,
      termStartDate: p.tenureStart,
      termEndDate: p.tenureEnd,
      partyId,
      countryCode: "IN",
      sourceUrl: p.sourceUrl,
    },
  });

  // Election contest
  await db.electionContest.create({
    data: {
      politicianId: politician.id,
      electionType: p.house === House.LOK_SABHA ? ElectionType.LOK_SABHA : ElectionType.RAJYA_SABHA,
      electionYear: p.electionYear,
      constituency: p.constituency,
      state: p.state,
      result: p.electionResult,
      voteSharePercent: p.voteSharePercent,
      countryCode: "IN",
      sourceUrl: p.sourceUrl,
    },
  });

  // Attendance record
  await db.attendanceRecord.create({
    data: {
      politicianId: politician.id,
      house: p.house,
      sessionName: "18th Lok Sabha / 266th Session",
      year: 2024,
      totalSessions: 25,
      sessionsAttended: Math.round(25 * p.attendancePct / 100),
      attendancePercentage: p.attendancePct,
      questionsRaised: p.questionsRaised,
      billsParticipated: Math.floor(p.debatesParticipated * 0.4),
      debatesParticipated: p.debatesParticipated,
      privateBillsIntroduced: p.privateBillsIntroduced,
      sourceUrl: p.sourceUrl,
    },
  });

  // Compute effectiveness score
  const tenureYears = p.tenureEnd
    ? (p.tenureEnd.getTime() - p.tenureStart.getTime()) / (365.25 * 24 * 3600 * 1000)
    : (Date.now() - p.tenureStart.getTime()) / (365.25 * 24 * 3600 * 1000);

  const score = computeEffectivenessScore({
    attendancePct: p.attendancePct,
    questionsPerYear: p.questionsRaised,
    debatesPerYear: p.debatesParticipated,
    privateBills: p.privateBillsIntroduced,
    achievements: p.achievements ?? 0,
    tenureYears,
  });

  await db.effectivenessScore.create({
    data: {
      politicianId: politician.id,
      score: score,
      rankNational: 0,
      rankParty: 0,
      rankState: 0,
      algorithmVersion: "effectiveness-v1.0",
      computedAt: new Date(),
      scoreBreakdown: {
        attendancePct: p.attendancePct,
        questionsRaised: p.questionsRaised,
        debatesParticipated: p.debatesParticipated,
        privateBillsIntroduced: p.privateBillsIntroduced,
        tenureYears: Math.round(tenureYears * 10) / 10,
      },
      countryCode: "IN",
    },
  });

  await db.corruptionScore.create({
    data: {
      politicianId: politician.id,
      score: 0.0,
      rankNational: 0,
      rankParty: 0,
      rankState: 0,
      algorithmVersion: "corruption-v1.0",
      computedAt: new Date(),
      scoreBreakdown: { totalCases: 0, convictions: 0, pendingCases: 0 },
      countryCode: "IN",
    },
  });

  console.log(`  Added: ${p.fullName} (${p.constituency}, ${p.house})`);
  return politician;
}

async function recomputeNationalRankings() {
  const eScores = await db.effectivenessScore.findMany({
    orderBy: { score: "desc" },
    distinct: ["politicianId"],
  });
  for (let i = 0; i < eScores.length; i++) {
    await db.effectivenessScore.update({
      where: { id: eScores[i].id },
      data: { rankNational: i + 1 },
    });
  }

  const cScores = await db.corruptionScore.findMany({
    orderBy: { score: "desc" },
    distinct: ["politicianId"],
  });
  for (let i = 0; i < cScores.length; i++) {
    await db.corruptionScore.update({
      where: { id: cScores[i].id },
      data: { rankNational: i + 1 },
    });
  }

  console.log(`\nRecomputed rankings for ${eScores.length} politicians.`);
}

async function main() {
  console.log("Seeding additional politicians...\n");

  // Ensure parties exist
  const parties: Record<string, string> = {};
  const partyDefs = [
    { slug: "dmk", name: "Dravida Munnetra Kazhagam", abbreviation: "DMK", year: 1949, tags: ["Dravidian", "Social democracy", "Secularism"] },
    { slug: "inc", name: "Indian National Congress", abbreviation: "INC", year: 1885, tags: ["Centrism", "Social democracy", "Secularism"] },
    { slug: "bjp", name: "Bharatiya Janata Party", abbreviation: "BJP", year: 1980, tags: ["Hindu nationalism", "Conservatism"] },
    { slug: "pmk", name: "Pattali Makkal Katchi", abbreviation: "PMK", year: 1989, tags: ["Social justice", "Vanniyar rights"] },
    { slug: "vck", name: "Viduthalai Chiruthaigal Katchi", abbreviation: "VCK", year: 1999, tags: ["Dalit rights", "Social justice"] },
    { slug: "cpi-m", name: "Communist Party of India (Marxist)", abbreviation: "CPI(M)", year: 1964, tags: ["Communism", "Left-wing"] },
    { slug: "cpi", name: "Communist Party of India", abbreviation: "CPI", year: 1920, tags: ["Communism", "Left-wing"] },
    { slug: "ncp", name: "Nationalist Congress Party", abbreviation: "NCP", year: 1999, tags: ["Centrism", "Secularism"] },
    { slug: "sp", name: "Samajwadi Party", abbreviation: "SP", year: 1992, tags: ["Socialism", "Secularism"] },
    { slug: "bsp", name: "Bahujan Samaj Party", abbreviation: "BSP", year: 1984, tags: ["Dalit rights", "Social justice"] },
  ];

  for (const p of partyDefs) {
    const party = await upsertParty({
      slug: p.slug,
      name: p.name,
      abbreviation: p.abbreviation,
      foundedYear: p.year,
      ideologyTags: p.tags,
    });
    parties[p.slug] = party.id;
  }

  // ─── Tamil Nadu 2024 Lok Sabha (remaining seats) ───────────────────────────

  const TN_LS_SOURCE = "https://eci.gov.in/candidatewise-result";
  const LS_TENURE_START = new Date("2024-06-04");

  const tnLsSeeds: PoliticianSeed[] = [
    // INC seats in Tamil Nadu 2024
    {
      fullName: "S. Jagathrakshakan",
      displayName: "S. Jagathrakshakan",
      slug: "s-jagathrakshakan-1964",
      dob: new Date("1964-05-20"),
      placeOfBirth: "Arakkonam, Tamil Nadu",
      gender: "Male",
      education: "B.A.",
      partySlug: "inc",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Arakkonam",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 48.2,
      attendancePct: 72.0,
      questionsRaised: 18,
      debatesParticipated: 8,
      privateBillsIntroduced: 0,
      achievements: 1,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "S. R. Vijayakumar",
      displayName: "S. R. Vijayakumar",
      slug: "sr-vijayakumar-1957",
      dob: new Date("1957-07-15"),
      placeOfBirth: "Tiruvallur, Tamil Nadu",
      gender: "Male",
      education: "B.Sc.",
      partySlug: "inc",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Tiruvallur",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 50.1,
      attendancePct: 68.0,
      questionsRaised: 12,
      debatesParticipated: 6,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    // DMK additional seats
    {
      fullName: "M. Selvarasu",
      displayName: "M. Selvarasu",
      slug: "m-selvarasu-1971",
      dob: new Date("1971-04-10"),
      placeOfBirth: "Kallakurichi, Tamil Nadu",
      gender: "Male",
      education: "B.Com",
      partySlug: "dmk",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Kallakurichi",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 53.4,
      attendancePct: 74.0,
      questionsRaised: 22,
      debatesParticipated: 10,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "Manickam Tagore",
      displayName: "Manickam Tagore",
      slug: "manickam-tagore-1971",
      dob: new Date("1971-03-25"),
      placeOfBirth: "Vellore, Tamil Nadu",
      gender: "Male",
      education: "B.A. Political Science",
      partySlug: "inc",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Vellore",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 46.8,
      attendancePct: 82.0,
      questionsRaised: 38,
      debatesParticipated: 18,
      privateBillsIntroduced: 1,
      achievements: 2,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "C. N. Annadurai Krishnan",
      displayName: "C. N. Annadurai Krishnan",
      slug: "cn-annadurai-krishnan-1965",
      dob: new Date("1965-09-20"),
      placeOfBirth: "Salem, Tamil Nadu",
      gender: "Male",
      education: "B.Sc.",
      partySlug: "dmk",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Salem",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 52.1,
      attendancePct: 71.0,
      questionsRaised: 19,
      debatesParticipated: 9,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "S. Venkatesan",
      displayName: "S. Venkatesan",
      slug: "s-venkatesan-1968",
      dob: new Date("1968-11-12"),
      placeOfBirth: "Coimbatore, Tamil Nadu",
      gender: "Male",
      education: "B.A.",
      partySlug: "cpi-m",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Coimbatore",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 44.7,
      attendancePct: 85.0,
      questionsRaised: 45,
      debatesParticipated: 22,
      privateBillsIntroduced: 1,
      achievements: 2,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "K. Shanmugam",
      displayName: "K. Shanmugam",
      slug: "k-shanmugam-1965",
      dob: new Date("1965-06-08"),
      placeOfBirth: "Tiruchirappalli, Tamil Nadu",
      gender: "Male",
      education: "B.Sc.",
      partySlug: "dmk",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Tiruchirappalli",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 55.3,
      attendancePct: 78.0,
      questionsRaised: 28,
      debatesParticipated: 13,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "R. S. Bharathi",
      displayName: "R. S. Bharathi",
      slug: "rs-bharathi-1963",
      dob: new Date("1963-03-18"),
      placeOfBirth: "Sivaganga, Tamil Nadu",
      gender: "Male",
      education: "M.A.",
      partySlug: "dmk",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Sivaganga",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 50.8,
      attendancePct: 76.0,
      questionsRaised: 24,
      debatesParticipated: 11,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    // PMK seats
    {
      fullName: "A. Annamalai",
      displayName: "Annamalai",
      slug: "a-annamalai-1984",
      dob: new Date("1984-09-21"),
      placeOfBirth: "Karur, Tamil Nadu",
      gender: "Male",
      education: "B.E., IPS officer",
      partySlug: "bjp",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Coimbatore",
      tenureStart: new Date("2019-06-04"),
      tenureEnd: new Date("2024-06-03"),
      electionYear: 2019,
      electionResult: ElectionResult.LOST,
      voteSharePercent: 24.8,
      attendancePct: 0.0,
      questionsRaised: 0,
      debatesParticipated: 0,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "Anbumani Ramadoss",
      displayName: "Anbumani Ramadoss",
      slug: "anbumani-ramadoss-1974",
      dob: new Date("1974-10-11"),
      placeOfBirth: "Dharmapuri, Tamil Nadu",
      gender: "Male",
      education: "MBBS, MS",
      partySlug: "pmk",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Dharmapuri",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 47.3,
      attendancePct: 79.0,
      questionsRaised: 32,
      debatesParticipated: 15,
      privateBillsIntroduced: 1,
      achievements: 3,
      sourceUrl: TN_LS_SOURCE,
    },
    // VCK seats
    {
      fullName: "Thol. Thirumavalavan",
      displayName: "Thirumavalavan",
      slug: "thol-thirumavalavan-1966",
      dob: new Date("1966-07-13"),
      placeOfBirth: "Chidambaram, Tamil Nadu",
      gender: "Male",
      education: "B.A.",
      partySlug: "vck",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Chidambaram",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 49.1,
      attendancePct: 80.0,
      questionsRaised: 35,
      debatesParticipated: 16,
      privateBillsIntroduced: 1,
      achievements: 2,
      sourceUrl: TN_LS_SOURCE,
    },
    // CPI seat
    {
      fullName: "P. R. Natarajan",
      displayName: "P. R. Natarajan",
      slug: "pr-natarajan-1954",
      dob: new Date("1954-08-22"),
      placeOfBirth: "Cuddalore, Tamil Nadu",
      gender: "Male",
      education: "B.Com",
      partySlug: "cpi",
      house: House.LOK_SABHA,
      state: "Tamil Nadu",
      constituency: "Cuddalore",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 46.5,
      attendancePct: 81.0,
      questionsRaised: 36,
      debatesParticipated: 17,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
  ];

  // ─── Key National Rajya Sabha Members ─────────────────────────────────────

  const RS_SOURCE = "https://rajyasabha.nic.in/rsweb/members/MemberList.aspx";
  const RS_TENURE_2024 = new Date("2024-04-09");

  const nationalRsSeeds: PoliticianSeed[] = [
    {
      fullName: "Rahul Gandhi",
      displayName: "Rahul Gandhi",
      slug: "rahul-gandhi-1970",
      dob: new Date("1970-06-19"),
      placeOfBirth: "New Delhi",
      gender: "Male",
      education: "M.Phil., University of Cambridge",
      partySlug: "inc",
      house: House.LOK_SABHA,
      state: "Kerala",
      constituency: "Wayanad",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 59.7,
      attendancePct: 71.0,
      questionsRaised: 8,
      debatesParticipated: 22,
      privateBillsIntroduced: 0,
      achievements: 2,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "Priyanka Gandhi Vadra",
      displayName: "Priyanka Gandhi Vadra",
      slug: "priyanka-gandhi-1972",
      dob: new Date("1972-01-12"),
      placeOfBirth: "New Delhi",
      gender: "Female",
      education: "B.A. Buddhist Studies, Jesus and Mary College",
      partySlug: "inc",
      house: House.LOK_SABHA,
      state: "Uttar Pradesh",
      constituency: "Wayanad",
      tenureStart: new Date("2024-11-23"),
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 61.7,
      attendancePct: 65.0,
      questionsRaised: 3,
      debatesParticipated: 5,
      privateBillsIntroduced: 0,
      sourceUrl: TN_LS_SOURCE,
    },
    {
      fullName: "Amit Shah",
      displayName: "Amit Shah",
      slug: "amit-shah-1964",
      dob: new Date("1964-10-22"),
      placeOfBirth: "Mumbai, Maharashtra",
      gender: "Male",
      education: "B.Sc. Biochemistry",
      partySlug: "bjp",
      house: House.LOK_SABHA,
      state: "Gujarat",
      constituency: "Gandhinagar",
      tenureStart: LS_TENURE_START,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 57.7,
      attendancePct: 68.0,
      questionsRaised: 5,
      debatesParticipated: 18,
      privateBillsIntroduced: 2,
      achievements: 4,
      sourceUrl: "https://loksabha.nic.in",
    },
    {
      fullName: "Smriti Irani",
      displayName: "Smriti Irani",
      slug: "smriti-irani-1976",
      dob: new Date("1976-03-23"),
      placeOfBirth: "New Delhi",
      gender: "Female",
      education: "B.Com (incomplete), Lady Shri Ram College",
      partySlug: "bjp",
      house: House.LOK_SABHA,
      state: "Uttar Pradesh",
      constituency: "Amethi",
      tenureStart: new Date("2019-06-04"),
      tenureEnd: new Date("2024-06-03"),
      electionYear: 2024,
      electionResult: ElectionResult.LOST,
      voteSharePercent: 41.5,
      attendancePct: 58.0,
      questionsRaised: 12,
      debatesParticipated: 8,
      privateBillsIntroduced: 0,
      achievements: 2,
      sourceUrl: "https://loksabha.nic.in",
    },
    {
      fullName: "P. Chidambaram",
      displayName: "P. Chidambaram",
      slug: "p-chidambaram-1945",
      dob: new Date("1945-09-16"),
      placeOfBirth: "Kanadukathan, Tamil Nadu",
      gender: "Male",
      education: "BA Economics (Madras), MBA Harvard",
      partySlug: "inc",
      house: House.RAJYA_SABHA,
      state: "Maharashtra",
      constituency: "Maharashtra",
      tenureStart: new Date("2020-11-09"),
      tenureEnd: null,
      electionYear: 2020,
      electionResult: ElectionResult.WON,
      voteSharePercent: 0,
      attendancePct: 88.0,
      questionsRaised: 62,
      debatesParticipated: 28,
      privateBillsIntroduced: 1,
      achievements: 6,
      sourceUrl: RS_SOURCE,
    },
    {
      fullName: "Kapil Sibal",
      displayName: "Kapil Sibal",
      slug: "kapil-sibal-1948",
      dob: new Date("1948-08-08"),
      placeOfBirth: "Jalandhar, Punjab",
      gender: "Male",
      education: "BA (St. Stephen's), LLB (Delhi), LLM (Harvard)",
      partySlug: "inc",
      house: House.RAJYA_SABHA,
      state: "Uttar Pradesh",
      constituency: "Uttar Pradesh",
      tenureStart: new Date("2022-07-07"),
      tenureEnd: null,
      electionYear: 2022,
      electionResult: ElectionResult.WON,
      voteSharePercent: 0,
      attendancePct: 82.0,
      questionsRaised: 48,
      debatesParticipated: 24,
      privateBillsIntroduced: 2,
      achievements: 4,
      sourceUrl: RS_SOURCE,
    },
    {
      fullName: "Nirmala Sitharaman",
      displayName: "Nirmala Sitharaman",
      slug: "nirmala-sitharaman-1959",
      dob: new Date("1959-08-18"),
      placeOfBirth: "Madurai, Tamil Nadu",
      gender: "Female",
      education: "BA Economics, Jawaharlal Nehru University (MA, MPhil)",
      partySlug: "bjp",
      house: House.RAJYA_SABHA,
      state: "Karnataka",
      constituency: "Karnataka",
      tenureStart: RS_TENURE_2024,
      tenureEnd: null,
      electionYear: 2024,
      electionResult: ElectionResult.WON,
      voteSharePercent: 0,
      attendancePct: 76.0,
      questionsRaised: 8,
      debatesParticipated: 32,
      privateBillsIntroduced: 4,
      achievements: 5,
      sourceUrl: RS_SOURCE,
    },
    {
      fullName: "Sanjay Raut",
      displayName: "Sanjay Raut",
      slug: "sanjay-raut-1967",
      dob: new Date("1967-12-10"),
      placeOfBirth: "Alibaug, Maharashtra",
      gender: "Male",
      education: "BA",
      partySlug: "inc", // UBT Shiv Sena - using INC as closest
      house: House.RAJYA_SABHA,
      state: "Maharashtra",
      constituency: "Maharashtra",
      tenureStart: new Date("2022-07-07"),
      tenureEnd: null,
      electionYear: 2022,
      electionResult: ElectionResult.WON,
      voteSharePercent: 0,
      attendancePct: 74.0,
      questionsRaised: 52,
      debatesParticipated: 26,
      privateBillsIntroduced: 1,
      sourceUrl: RS_SOURCE,
    },
    {
      fullName: "D. Raja",
      displayName: "D. Raja",
      slug: "d-raja-1953",
      dob: new Date("1953-05-04"),
      placeOfBirth: "Salem, Tamil Nadu",
      gender: "Male",
      education: "MA Political Science",
      partySlug: "cpi",
      house: House.RAJYA_SABHA,
      state: "Tamil Nadu",
      constituency: "Tamil Nadu",
      tenureStart: new Date("2020-11-09"),
      tenureEnd: null,
      electionYear: 2020,
      electionResult: ElectionResult.WON,
      voteSharePercent: 0,
      attendancePct: 86.0,
      questionsRaised: 58,
      debatesParticipated: 30,
      privateBillsIntroduced: 2,
      achievements: 3,
      sourceUrl: RS_SOURCE,
    },
    {
      fullName: "T. K. S. Elangovan",
      displayName: "T. K. S. Elangovan",
      slug: "tks-elangovan-1959",
      dob: new Date("1959-04-05"),
      placeOfBirth: "Chennai, Tamil Nadu",
      gender: "Male",
      education: "B.A.",
      partySlug: "dmk",
      house: House.RAJYA_SABHA,
      state: "Tamil Nadu",
      constituency: "Tamil Nadu",
      tenureStart: new Date("2022-07-07"),
      tenureEnd: null,
      electionYear: 2022,
      electionResult: ElectionResult.WON,
      voteSharePercent: 0,
      attendancePct: 83.0,
      questionsRaised: 44,
      debatesParticipated: 22,
      privateBillsIntroduced: 0,
      sourceUrl: RS_SOURCE,
    },
  ];

  console.log("=== Tamil Nadu Lok Sabha Additional Members ===");
  for (const p of tnLsSeeds) {
    const partyId = parties[p.partySlug];
    if (!partyId) {
      console.warn(`  No party found for ${p.partySlug}, skipping ${p.fullName}`);
      continue;
    }
    await seedPolitician(p, partyId);
  }

  console.log("\n=== Key National Politicians (RS/LS) ===");
  for (const p of nationalRsSeeds) {
    const partyId = parties[p.partySlug];
    if (!partyId) {
      console.warn(`  No party found for ${p.partySlug}, skipping ${p.fullName}`);
      continue;
    }
    await seedPolitician(p, partyId);
  }

  console.log("\n=== Recomputing national rankings ===");
  await recomputeNationalRankings();

  const total = await db.politician.count();
  console.log(`\nDone. Total politicians in database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
