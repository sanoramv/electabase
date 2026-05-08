import type { DataSource } from "@prisma/client";
import type { ScraperResult, ScrapedAttendanceRecord } from "./base";
import * as cheerio from "cheerio";

const PRS_BASE = "https://prsindia.org";

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

export async function scrapePRS(source: DataSource): Promise<ScraperResult> {
  const start = Date.now();
  const attendanceRecords: ScrapedAttendanceRecord[] = [];
  let errorDetail: string | undefined;

  try {
    const html = await fetchHtml(`${PRS_BASE}/legislators/`);
    const $ = cheerio.load(html);

    // PRS legislator pages list members with attendance and legislative stats
    $("table.legislator-table tr, .legislator-row").each((_, el) => {
      const cells = $(el).find("td");
      if (cells.length < 4) return;

      const name = $(cells[0]).text().trim();
      const house = $(cells[1]).text().trim().toUpperCase();
      const attendancePct = parseFloat($(cells[2]).text().replace("%", ""));
      const questionsRaised = parseInt($(cells[3]).text(), 10);
      const debates = parseInt($(cells[4]).text(), 10) || 0;
      const privateBills = parseInt($(cells[5]).text(), 10) || 0;
      const year = new Date().getFullYear();
      const sessionName = $(cells[6]).text().trim() || `${year} Session`;

      if (!name || isNaN(attendancePct)) return;

      const mappedHouse: "LOK_SABHA" | "RAJYA_SABHA" = house.includes("RAJYA")
        ? "RAJYA_SABHA"
        : "LOK_SABHA";

      attendanceRecords.push({
        politicianFullName: name,
        house: mappedHouse,
        sessionName,
        year,
        totalSessions: 100,
        sessionsAttended: Math.round(attendancePct),
        attendancePercentage: isNaN(attendancePct) ? 0 : attendancePct,
        questionsRaised: isNaN(questionsRaised) ? 0 : questionsRaised,
        debatesParticipated: isNaN(debates) ? 0 : debates,
        privateBillsIntroduced: isNaN(privateBills) ? 0 : privateBills,
        sourceUrl: `${PRS_BASE}/legislators/`,
      });
    });
  } catch (err) {
    errorDetail = err instanceof Error ? err.message : String(err);
  }

  return {
    sourceId: source.id,
    status:
      errorDetail && attendanceRecords.length === 0
        ? "FAILED"
        : errorDetail
          ? "PARTIAL"
          : "SUCCESS",
    recordsScraped: attendanceRecords.length,
    errorDetail,
    durationMs: Date.now() - start,
    data: { attendanceRecords },
  };
}
