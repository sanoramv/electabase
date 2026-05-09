import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const rows = await p.$queryRawUnsafe(`
    SELECT
      full_name,
      COUNT(*)::int AS cnt,
      array_agg(id ORDER BY created_at ASC) AS ids,
      array_agg(slug ORDER BY created_at ASC) AS slugs
    FROM politicians
    GROUP BY full_name
    HAVING COUNT(*) > 1
    ORDER BY full_name
  `) as any[];

  for (const r of rows) {
    console.log(JSON.stringify(r));
  }
  console.log(`\nTotal duplicate groups: ${rows.length}`);
}

main().catch(console.error).finally(() => p.$disconnect());
