import type { DataSource } from "@prisma/client";
import type {
  ScraperResult,
  ScrapedPolitician,
  ScrapedAttendanceRecord,
} from "./base";
import { getScopeStates, withPage } from "./base";

const LS_BASE = "https://loksabha.nic.in";

export async function scrapeLokSabha(source: DataSource): Promise<ScraperResult> {
  const start = Date.now();
  const politicians: ScrapedPolitician[] = [];
  const attendanceRecords: ScrapedAttendanceRecord[] = [];
  let errorDetail: string | undefined;

  // Read scope from DataSource config — only scrape these states
  const scopeStates = getScopeStates(source); // ["Tamil Nadu"] in v1

  try {
    await withPage(async (ctx) => {
      const page = await ctx.newPage();

      // Fetch the member portal
      await page.goto(`${LS_BASE}/Members/lokprev.aspx`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Extract member list — filter to scopeStates if provided
      const members = await page.$$eval(
        "#ctl00_ContentPlaceHolder1_GridView1 tr, .member-row",
        (trs, states) =>
          trs.slice(1).flatMap((tr) => {
            const cells = Array.from(tr.querySelectorAll("td, th")).map((td) =>
              td.textContent?.trim() ?? ""
            );
            if (cells.length < 3) return [];
            const [name, , constituency, state] = cells;
            // Filter by scope states
            if (
              states &&
              states.length > 0 &&
              state &&
              !states.some((s) => state.toLowerCase().includes(s.toLowerCase()))
            ) {
              return [];
            }
            return [{ name, constituency, state }];
          }),
        scopeStates
      );

      for (const member of members) {
        if (!member.name) continue;
        politicians.push({
          fullName: member.name,
          displayName: member.name,
          party: undefined,
          sourceUrl: `${LS_BASE}/Members/lokprev.aspx`,
        });
      }

      // Attendance records would be fetched per member from the attendance DB
      // loksabha.nic.in/Members/MemberAttendance.aspx
      // Abbreviated implementation — full scraping traverses each member page

      await page.close();
    });
  } catch (err) {
    errorDetail = err instanceof Error ? err.message : String(err);
  }

  return {
    sourceId: source.id,
    status:
      errorDetail && politicians.length === 0
        ? "FAILED"
        : errorDetail
          ? "PARTIAL"
          : "SUCCESS",
    recordsScraped: politicians.length + attendanceRecords.length,
    errorDetail,
    durationMs: Date.now() - start,
    data: { politicians, attendanceRecords },
  };
}
