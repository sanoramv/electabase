import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.politician.findMany({
    select: {
      id: true, fullName: true,
      currentParty: { select: { abbreviation: true } },
      netWorthDeclared: true,
      netWorthSourceUrl: true,
      professionBeforePolitics: true,
      crimeRecords: { select: { id: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const withData = rows.filter((r) => r.netWorthDeclared !== null || r.professionBeforePolitics !== null);
  const missing = rows.filter((r) => r.netWorthDeclared === null && r.professionBeforePolitics === null);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`TOTAL: ${rows.length} politicians`);
  console.log(`  With affidavit data: ${withData.length}`);
  console.log(`  Missing all data:    ${missing.length}`);

  console.log(`\n── WITH DATA (${withData.length}):`);
  for (const r of withData) {
    const nw = r.netWorthDeclared ? `₹${Math.round(Number(r.netWorthDeclared) / 100000)}L` : "—";
    const src = r.netWorthSourceUrl ? "myneta" : "seed";
    console.log(`  ✓ ${r.fullName} (${r.currentParty?.abbreviation}) | ${nw} | prof=${r.professionBeforePolitics?.substring(0, 40) ?? "—"} | crimes=${r.crimeRecords.length} | src=${src}`);
  }

  console.log(`\n── MISSING (${missing.length}):`);
  for (const r of missing) {
    console.log(`  – ${r.fullName} (${r.currentParty?.abbreviation})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
