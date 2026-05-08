import type { DataSource } from "@prisma/client";
import type {
  ScraperResult,
  ScrapedPolitician,
  ScrapedAttendanceRecord,
} from "./base";
import { withPage } from "./base";

const RS_BASE = "https://rajyasabha.nic.in";

export async function scrapeRajyaSabha(source: DataSource): Promise<ScraperResult> {
  const start = Date.now();
  const politicians: ScrapedPolitician[] = [];
  const attendanceRecords: ScrapedAttendanceRecord[] = [];
  let errorDetail: string | undefined;

  // Rajya Sabha scope: all states (no state filter applied)

  try {
    await withPage(async (ctx) => {
      const page = await ctx.newPage();

      // Member portal — lists all current and former RS members
      await page.goto(`${RS_BASE}/rsweb/members/MemberList.aspx`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const members = await page.$$eval(
        "#ctl00_ContentPlaceHolder1_GridView1 tr, .member-table tr",
        (trs) =>
          trs.slice(1).map((tr) => {
            const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
              td.textContent?.trim() ?? ""
            );
            return {
              name: cells[0] ?? "",
              state: cells[1] ?? "",
              party: cells[2] ?? "",
              profileUrl: tr.querySelector("a")?.getAttribute("href") ?? "",
            };
          })
      );

      for (const member of members) {
        if (!member.name) continue;
        politicians.push({
          fullName: member.name,
          displayName: member.name,
          party: member.party || undefined,
          sourceUrl: `${RS_BASE}/rsweb/members/MemberList.aspx`,
        });
      }

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
