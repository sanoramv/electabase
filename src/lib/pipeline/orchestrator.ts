import { db } from "@/lib/db/client";
import { scrapeECI } from "@/lib/scrapers/eci";
import { scrapeLokSabha } from "@/lib/scrapers/lok-sabha";
import { scrapeRajyaSabha } from "@/lib/scrapers/rajya-sabha";
import { scrapePRS } from "@/lib/scrapers/prs";
import { scrapeADR } from "@/lib/scrapers/adr";
import { closeBrowser } from "@/lib/scrapers/base";
import { upsertPolitician } from "./diff";
import { sendRefreshSummaryEmail } from "@/lib/email/notifications";
import type { ScraperResult } from "@/lib/scrapers/base";
import type { DataSource } from "@prisma/client";

const SCRAPER_MAP: Record<
  string,
  (source: DataSource) => Promise<ScraperResult>
> = {
  "https://eci.gov.in": scrapeECI,
  "https://loksabha.nic.in": scrapeLokSabha,
  "https://rajyasabha.nic.in": scrapeRajyaSabha,
  "https://prsindia.org": scrapePRS,
  "https://adrindia.org": scrapeADR,
};

async function runScraper(
  source: DataSource
): Promise<{ result: ScraperResult; recordsAdded: number; recordsUpdated: number }> {
  const scraper = SCRAPER_MAP[source.url];
  if (!scraper) {
    return {
      result: {
        sourceId: source.id,
        status: "FAILED",
        recordsScraped: 0,
        errorDetail: `No scraper registered for URL: ${source.url}`,
        durationMs: 0,
        data: {},
      },
      recordsAdded: 0,
      recordsUpdated: 0,
    };
  }

  const result = await scraper(source);
  let recordsAdded = 0;
  let recordsUpdated = 0;

  // Upsert scraped politicians
  if (result.data.politicians) {
    for (const p of result.data.politicians) {
      const { isNew } = await upsertPolitician(p);
      if (isNew) recordsAdded++;
      else recordsUpdated++;
    }
  }

  // Election contests, attendance records etc. would be upserted here
  // (abbreviated — full implementation adds upsert helpers per entity type)

  return { result, recordsAdded, recordsUpdated };
}

async function createRefreshLog(
  trigger: "SCHEDULED" | "ADMIN" | "TARGETED",
  adminId?: string,
  targetSourceId?: string
) {
  return db.refreshLog.create({
    data: {
      triggeredBy: trigger,
      status: "PARTIAL",
      adminId,
      targetSourceId,
    },
  });
}

async function finalizeRefreshLog(
  logId: string,
  sourceResults: ScraperResult[],
  totalAdded: number,
  totalUpdated: number
) {
  const hasFailure = sourceResults.some((r) => r.status === "FAILED");
  const allFailed = sourceResults.every((r) => r.status === "FAILED");

  await db.refreshLog.update({
    where: { id: logId },
    data: {
      completedAt: new Date(),
      status: allFailed ? "FAILED" : hasFailure ? "PARTIAL" : "SUCCESS",
      recordsAdded: totalAdded,
      recordsUpdated: totalUpdated,
    },
  });

  // Write per-source breakdown
  for (const r of sourceResults) {
    await db.refreshLogSource.create({
      data: {
        refreshLogId: logId,
        dataSourceId: r.sourceId,
        status: r.status,
        recordsScraped: r.recordsScraped,
        errorDetail: r.errorDetail,
        durationMs: r.durationMs,
      },
    });
  }
}

export async function runFullPipeline(adminId?: string): Promise<string> {
  const log = await createRefreshLog(adminId ? "ADMIN" : "SCHEDULED", adminId);

  const sources = await db.dataSource.findMany({ where: { isActive: true } });
  const sourceResults: ScraperResult[] = [];
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    for (const source of sources) {
      const { result, recordsAdded, recordsUpdated } = await runScraper(source);
      sourceResults.push(result);
      totalAdded += recordsAdded;
      totalUpdated += recordsUpdated;
    }
  } finally {
    await closeBrowser();
    await finalizeRefreshLog(log.id, sourceResults, totalAdded, totalUpdated);

    const fullLog = await db.refreshLog.findUnique({
      where: { id: log.id },
      include: {
        sourceResults: { include: { dataSource: true } },
      },
    });
    if (fullLog) {
      await sendRefreshSummaryEmail({
        ...fullLog,
        sourceResults: fullLog.sourceResults.map((s) => ({
          ...s,
          status: s.status as string,
        })),
      });
    }
  }

  return log.id;
}

export async function runTargetedPipeline(
  sourceId: string,
  adminId?: string
): Promise<string> {
  const log = await createRefreshLog("TARGETED", adminId, sourceId);

  const source = await db.dataSource.findUnique({ where: { id: sourceId } });
  if (!source) {
    await db.refreshLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "FAILED",
      },
    });
    return log.id;
  }

  const { result, recordsAdded, recordsUpdated } = await runScraper(source);

  try {
    await finalizeRefreshLog(log.id, [result], recordsAdded, recordsUpdated);
  } finally {
    await closeBrowser();
  }

  return log.id;
}
