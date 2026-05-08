import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 5 DataSource records — v1 scraping scope
  const sources = [
    {
      name: "Election Commission of India",
      url: "https://eci.gov.in",
      type: "GOVERNMENT" as const,
      reliabilityTier: 1,
      scraperConfig: {
        scope: { house: null, states: null },
        urlPatterns: ["/statistical-report/", "/delimitation/"],
        dataTypes: ["election_results", "candidate_affidavits"],
        notes: "ECI covers all houses; pipeline filters by other sources scope",
      },
    },
    {
      name: "Lok Sabha",
      url: "https://loksabha.nic.in",
      type: "GOVERNMENT" as const,
      reliabilityTier: 1,
      scraperConfig: {
        scope: { house: "LOK_SABHA", states: ["Tamil Nadu"] },
        urlPatterns: ["/members/", "/questions/", "/debates/"],
        dataTypes: ["member_profiles", "attendance", "questions", "debates"],
        notes: "v1 scope: Tamil Nadu only. Expand via scraperConfig.scope.states",
      },
    },
    {
      name: "Rajya Sabha",
      url: "https://rajyasabha.nic.in",
      type: "GOVERNMENT" as const,
      reliabilityTier: 1,
      scraperConfig: {
        scope: { house: "RAJYA_SABHA", states: null },
        urlPatterns: ["/members/", "/questions/", "/debates/"],
        dataTypes: ["member_profiles", "attendance", "questions", "debates"],
        notes: "All states. states:null means no state filter applied.",
      },
    },
    {
      name: "PRS Legislative Research",
      url: "https://prsindia.org",
      type: "NGO" as const,
      reliabilityTier: 1,
      scraperConfig: {
        scope: { house: null, states: null },
        urlPatterns: ["/legislators/"],
        dataTypes: ["legislative_participation", "bills", "committees"],
        notes: "Cross-house. Pipeline applies in-scope politician filter.",
      },
    },
    {
      name: "Association for Democratic Reforms",
      url: "https://adrindia.org",
      type: "NGO" as const,
      reliabilityTier: 1,
      scraperConfig: {
        scope: { house: null, states: null },
        urlPatterns: ["/our-work/election-watch/", "/myneta/"],
        dataTypes: ["criminal_cases", "assets", "liabilities"],
        notes: "Affidavit PDFs parsed with pdf-parse. Filters to in-scope politicians.",
      },
    },
  ];

  for (const source of sources) {
    await prisma.dataSource.upsert({
      where: { id: source.url },
      create: { ...source, id: source.url },
      update: { scraperConfig: source.scraperConfig },
    });
  }

  // 5 AdZone records — all enabled by default
  const adZones = [
    "header-banner",
    "sidebar-top",
    "sidebar-bottom",
    "in-feed",
    "profile-mid",
  ];

  for (const zoneKey of adZones) {
    await prisma.adZone.upsert({
      where: { zoneKey },
      create: { zoneKey, isEnabled: true },
      update: {},
    });
  }

  console.log("Seed complete: 5 DataSources + 5 AdZones created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
