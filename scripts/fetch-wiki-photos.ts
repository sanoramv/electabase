/**
 * Fetches Wikipedia thumbnail photos for politicians where photo_url is null.
 * Uses only the Wikipedia REST API (page/summary endpoint).
 * Processes in batches of 10 with a 1-second delay between batches.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const UA = "ElectaBase/1.0 (https://electabase.in; contact@electabase.in) Node.js";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWikiSummary(name: string): Promise<string | null> {
  const url = `${WIKI_API}/${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json() as { thumbnail?: { source?: string }; type?: string };
    // Reject disambiguation pages
    if (data.type === "disambiguation") return null;
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// Try multiple name variants to maximise match rate
function buildSearchNames(fullName: string): string[] {
  const names: string[] = [fullName];

  // "A. Annamalai" → "Annamalai" (last name only, sometimes works for well-known politicians)
  const withoutInitial = fullName.replace(/^[A-Z]\.\s+/, "").trim();
  if (withoutInitial !== fullName) names.push(withoutInitial);

  // "Thiru X Y" → "X Y"
  const withoutTitle = fullName.replace(/^(Thiru\.?\s+|Thol\.\s+|Dr\.?\s+|Shri\.?\s+)/i, "").trim();
  if (withoutTitle !== fullName) names.push(withoutTitle);

  // Add "(politician)" suffix for common disambiguation
  names.push(`${fullName} (politician)`);
  if (withoutInitial !== fullName) names.push(`${withoutInitial} (politician)`);

  return [...new Set(names)];
}

async function findPhoto(fullName: string): Promise<{ url: string; variant: string } | null> {
  for (const variant of buildSearchNames(fullName)) {
    const photoUrl = await fetchWikiSummary(variant);
    if (photoUrl) return { url: photoUrl, variant };
  }
  return null;
}

async function main() {
  const politicians = await prisma.politician.findMany({
    where: { photoUrl: null },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  console.log(`Found ${politicians.length} politicians without photos.\n`);

  let found = 0;
  let stillNull = 0;

  for (let i = 0; i < politicians.length; i += BATCH_SIZE) {
    const batch = politicians.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(politicians.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} (politicians ${i + 1}–${Math.min(i + BATCH_SIZE, politicians.length)}):`);

    await Promise.all(
      batch.map(async (pol) => {
        const result = await findPhoto(pol.fullName);
        if (result) {
          await prisma.politician.update({
            where: { id: pol.id },
            data: {
              photoUrl: result.url,
              photoSourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.variant)}`,
            },
          });
          console.log(`  ✓ ${pol.fullName} → ${result.variant}`);
          found++;
        } else {
          console.log(`  – ${pol.fullName} (no photo)`);
          stillNull++;
        }
      })
    );

    if (i + BATCH_SIZE < politicians.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`  Politicians processed: ${politicians.length}`);
  console.log(`  Photos found:          ${found}`);
  console.log(`  Still null:            ${stillNull}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
