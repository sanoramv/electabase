import type { DataSource } from "@prisma/client";
import { chromium, type Browser, type BrowserContext } from "playwright";

export interface ScraperResult {
  sourceId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  recordsScraped: number;
  errorDetail?: string;
  durationMs: number;
  data: ScrapedData;
}

export interface ScrapedData {
  politicians?: ScrapedPolitician[];
  electionContests?: ScrapedElectionContest[];
  attendanceRecords?: ScrapedAttendanceRecord[];
  crimeRecords?: ScrapedCrimeRecord[];
}

export interface ScrapedPolitician {
  fullName: string;
  displayName?: string;
  photoUrl?: string;
  photoSourceUrl?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  gender?: string;
  highestEducation?: string;
  party?: string;
  sourceUrl: string;
}

export interface ScrapedElectionContest {
  politicianFullName: string;
  electionType: string;
  electionYear: number;
  constituency: string;
  state: string;
  result: "WON" | "LOST" | "DISQUALIFIED";
  voteCount?: number;
  voteSharePercent?: number;
  sourceUrl: string;
}

export interface ScrapedAttendanceRecord {
  politicianFullName: string;
  house: "LOK_SABHA" | "RAJYA_SABHA";
  sessionName: string;
  year: number;
  totalSessions: number;
  sessionsAttended: number;
  attendancePercentage: number;
  questionsRaised?: number;
  billsParticipated?: number;
  debatesParticipated?: number;
  privateBillsIntroduced?: number;
  sourceUrl: string;
}

export interface ScrapedCrimeRecord {
  politicianFullName: string;
  chargeDescription: string;
  ipcSection?: string;
  ipcSeverityTier?: number;
  courtName?: string;
  caseStatus: "PENDING" | "CONVICTED" | "ACQUITTED" | "APPEALING";
  jailTimeDays?: number;
  sourceUrl: string;
}

export function getScopeStates(source: DataSource): string[] | null {
  const config = source.scraperConfig as {
    scope?: { states?: string[] | null };
  } | null;
  return config?.scope?.states ?? null;
}

export function getScopeHouse(
  source: DataSource
): "LOK_SABHA" | "RAJYA_SABHA" | null {
  const config = source.scraperConfig as {
    scope?: { house?: string | null };
  } | null;
  return (config?.scope?.house as "LOK_SABHA" | "RAJYA_SABHA") ?? null;
}

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function withPage<T>(
  fn: (context: BrowserContext) => Promise<T>
): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; ElectaBase/1.0; +https://electabase.in/bot)",
  });
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}
