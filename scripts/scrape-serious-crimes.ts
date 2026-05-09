/**
 * Scrapes all 21 pages of Tamil Nadu 2026 serious criminal cases from myneta.info
 * and stores the raw data in the myneta_serious_crimes table.
 */
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL =
  "https://www.myneta.info/TamilNadu2026/index.php?action=summary&subAction=serious_crime&sort=candidate&page=";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120";
const TOTAL_PAGES = 21;
const DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(page: number): Promise<string> {
  const url = `${BASE_URL}${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  return res.text();
}

interface CandidateRow {
  candidateName: string;
  candidateProfileUrl: string;
  constituency: string;
  party: string;
  criminalCasesCount: number;
  education: string;
  totalAssetsRaw: string;
  liabilitiesRaw: string;
  sourceUrl: string;
}

function parsePage(html: string, pageNum: number): CandidateRow[] {
  const $ = cheerio.load(html);
  const sourceUrl = `${BASE_URL}${pageNum}`;
  const rows: CandidateRow[] = [];

  // The summary table has a header row; data rows follow
  // We look for all <tr> inside the main content table that have <td> children
  $("table tr").each((_i, el) => {
    const tds = $(el).find("td");
    // Data rows have 8 columns: Sno, Candidate, Constituency, Party,
    // Criminal Cases, Education, Total Assets, Liabilities
    if (tds.length < 8) return;

    const snoText = $(tds[0]).text().trim();
    // Skip header or non-data rows (Sno column should be a number)
    if (!/^\d+$/.test(snoText)) return;

    // Candidate name and profile URL
    const candidateCell = $(tds[1]);
    const anchor = candidateCell.find("a").first();
    const candidateName = anchor.text().replace(/\s+/g, " ").trim();
    const href = anchor.attr("href") ?? "";
    const candidateProfileUrl = href.startsWith("http")
      ? href
      : `https://www.myneta.info${href.startsWith("/") ? "" : "/TamilNadu2026/"}${href}`;

    if (!candidateName) return;

    const constituency = $(tds[2]).text().replace(/\s+/g, " ").trim();
    const party = $(tds[3]).text().replace(/\s+/g, " ").trim();

    const criminalCasesRaw = $(tds[4]).text().replace(/\s+/g, " ").trim();
    const criminalCasesCount = parseInt(criminalCasesRaw, 10);
    if (isNaN(criminalCasesCount)) return;

    const education = $(tds[5]).text().replace(/\s+/g, " ").trim();
    const totalAssetsRaw = $(tds[6]).text().replace(/\s+/g, " ").trim();
    const liabilitiesRaw = $(tds[7]).text().replace(/\s+/g, " ").trim();

    rows.push({
      candidateName,
      candidateProfileUrl,
      constituency,
      party,
      criminalCasesCount,
      education,
      totalAssetsRaw,
      liabilitiesRaw,
      sourceUrl,
    });
  });

  return rows;
}

async function main() {
  const allRows: CandidateRow[] = [];
  const failedPages: number[] = [];

  console.log(`Starting scrape of ${TOTAL_PAGES} pages...\n`);

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = `${BASE_URL}${page}`;
    try {
      console.log(`Fetching page ${page}/${TOTAL_PAGES}: ${url}`);
      const html = await fetchPage(page);
      const rows = parsePage(html, page);
      console.log(`  → ${rows.length} candidates found`);
      allRows.push(...rows);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      console.error(`  ✗ Page ${page} failed: ${msg}`);
      failedPages.push(page);
    }

    if (page < TOTAL_PAGES) {
      await delay(DELAY_MS);
    }
  }

  console.log(`\nScraping complete. Total rows collected: ${allRows.length}`);
  console.log("Inserting into database...\n");

  // Clear existing records for this election to allow re-runs
  const deleted = await prisma.mynetaSeriousCrime.deleteMany({
    where: { electionYear: 2026, state: "Tamil Nadu" },
  });
  if (deleted.count > 0) {
    console.log(`Cleared ${deleted.count} existing records.`);
  }

  let inserted = 0;
  for (const row of allRows) {
    await prisma.mynetaSeriousCrime.create({
      data: {
        candidateName: row.candidateName,
        candidateProfileUrl: row.candidateProfileUrl,
        constituency: row.constituency,
        party: row.party,
        criminalCasesCount: row.criminalCasesCount,
        education: row.education,
        totalAssetsRaw: row.totalAssetsRaw,
        liabilitiesRaw: row.liabilitiesRaw,
        electionYear: 2026,
        state: "Tamil Nadu",
        sourceUrl: row.sourceUrl,
      },
    });
    inserted++;
  }

  console.log("═".repeat(64));
  console.log(`\nSUMMARY`);
  console.log(`  Total pages:    ${TOTAL_PAGES}`);
  console.log(`  Successful:     ${TOTAL_PAGES - failedPages.length}`);
  console.log(`  Failed pages:   ${failedPages.length}${failedPages.length > 0 ? ` (${failedPages.join(", ")})` : ""}`);
  console.log(`  Records scraped: ${allRows.length}`);
  console.log(`  Records inserted: ${inserted}`);
  if (failedPages.length > 0) {
    console.log(`\n  Failed pages: ${failedPages.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
