import type { DataSource } from "@prisma/client";
import type { ScraperResult, ScrapedCrimeRecord } from "./base";
import * as cheerio from "cheerio";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const ADR_BASE = "https://adrindia.org";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ElectaBase/1.0; +https://electabase.in/bot)",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function fetchPdfText(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching PDF ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const parsed = await pdfParse(buffer);
  return parsed.text as string;
}

function parseIpcSeverityTier(ipcSection: string): number {
  // Map IPC sections to severity tiers
  const severe = /302|376|120B|121|153A|POCSO|NDPS/i;
  const serious = /420|406|409|307|395|499|Prevention of Corruption/i;
  const moderate = /147|148|149|151|107/i;
  if (severe.test(ipcSection)) return 1;
  if (serious.test(ipcSection)) return 2;
  if (moderate.test(ipcSection)) return 3;
  return 4;
}

export async function scrapeADR(source: DataSource): Promise<ScraperResult> {
  const start = Date.now();
  const crimeRecords: ScrapedCrimeRecord[] = [];
  let errorDetail: string | undefined;

  try {
    const html = await fetchHtml(`${ADR_BASE}/our-work/election-watch/`);
    const $ = cheerio.load(html);

    // ADR lists candidate affidavit PDFs per election
    const pdfLinks: string[] = [];
    $("a[href$='.pdf'], a[href*='affidavit']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) pdfLinks.push(href.startsWith("http") ? href : `${ADR_BASE}${href}`);
    });

    // Parse first 10 PDFs to avoid rate limiting on initial run
    for (const pdfUrl of pdfLinks.slice(0, 10)) {
      try {
        const text = await fetchPdfText(pdfUrl);

        // Extract criminal case blocks from ADR affidavit text
        // ADR affidavits have structured sections: "CRIMINAL ANTECEDENTS"
        const criminalSection = text.match(
          /CRIMINAL ANTECEDENTS[\s\S]*?(?=ASSETS|LIABILITIES|$)/i
        )?.[0];
        if (!criminalSection) continue;

        // Extract candidate name from affidavit header
        const candidateName = text.match(/Name\s*:\s*([^\n]+)/i)?.[1]?.trim();
        if (!candidateName) continue;

        // Extract IPC sections mentioned
        const ipcMatches = criminalSection.matchAll(/(?:IPC|Section)\s+([\d]+[A-Z]*)/gi);
        for (const match of ipcMatches) {
          const ipcSection = match[1];
          const tier = parseIpcSeverityTier(ipcSection);

          crimeRecords.push({
            politicianFullName: candidateName,
            chargeDescription: `Case under Section ${ipcSection}`,
            ipcSection,
            ipcSeverityTier: tier,
            caseStatus: "PENDING",
            sourceUrl: pdfUrl,
          });
        }
      } catch {
        // Skip individual PDF failures; continue with remaining PDFs
      }
    }
  } catch (err) {
    errorDetail = err instanceof Error ? err.message : String(err);
  }

  return {
    sourceId: source.id,
    status:
      errorDetail && crimeRecords.length === 0
        ? "FAILED"
        : errorDetail
          ? "PARTIAL"
          : "SUCCESS",
    recordsScraped: crimeRecords.length,
    errorDetail,
    durationMs: Date.now() - start,
    data: { crimeRecords },
  };
}
