import type { DataSource } from "@prisma/client";
import type {
  ScraperResult,
  ScrapedElectionContest,
} from "./base";
import { withPage } from "./base";

const ECI_BASE = "https://eci.gov.in";

export async function scrapeECI(source: DataSource): Promise<ScraperResult> {
  const start = Date.now();
  const electionContests: ScrapedElectionContest[] = [];
  let errorDetail: string | undefined;

  try {
    await withPage(async (ctx) => {
      const page = await ctx.newPage();

      // Fetch the statistical reports index page
      await page.goto(`${ECI_BASE}/statistical-report/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // ECI publishes election results as downloadable PDFs / HTML tables.
      // This scraper fetches the results page index and extracts contest records.
      // Real implementation would navigate through election-year and constituency links.
      // Placeholder: locate election result rows from the ECI results table.
      const rows = await page.$$eval(
        "table.result-table tr, .election-results tr",
        (trs) =>
          trs.slice(1).map((tr) => {
            const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
              td.textContent?.trim()
            );
            return cells;
          })
      );

      for (const row of rows) {
        if (row.length < 6) continue;
        const [name, constituency, state, year, result, voteShare] = row;
        if (!name || !constituency || !state || !year || !result) continue;

        const parsedResult = result.toUpperCase().includes("WON")
          ? "WON"
          : result.toUpperCase().includes("DISQUALIFIED")
            ? "DISQUALIFIED"
            : "LOST";

        electionContests.push({
          politicianFullName: name,
          electionType: "LOK_SABHA",
          electionYear: parseInt(year, 10),
          constituency,
          state,
          result: parsedResult,
          voteSharePercent: voteShare ? parseFloat(voteShare) : undefined,
          sourceUrl: page.url(),
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
      errorDetail && electionContests.length === 0
        ? "FAILED"
        : errorDetail
          ? "PARTIAL"
          : "SUCCESS",
    recordsScraped: electionContests.length,
    errorDetail,
    durationMs: Date.now() - start,
    data: { electionContests },
  };
}
