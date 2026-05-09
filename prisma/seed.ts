import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 8 DataSource records — v1 scraping scope + approved journalistic sources
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
    {
      name: "The Times of India",
      url: "https://timesofindia.com",
      type: "JOURNALISTIC" as const,
      reliabilityTier: 2,
      scraperConfig: {
        scope: { house: null, states: null },
        urlPatterns: [],
        dataTypes: ["news_articles"],
        notes: "Approved journalistic source for admin-cited URLs only. Not scraped automatically in v1.",
      },
    },
    {
      name: "The Hindu",
      url: "https://thehindu.com",
      type: "JOURNALISTIC" as const,
      reliabilityTier: 2,
      scraperConfig: {
        scope: { house: null, states: null },
        urlPatterns: [],
        dataTypes: ["news_articles"],
        notes: "Approved journalistic source for admin-cited URLs only. Not scraped automatically in v1.",
      },
    },
    {
      name: "The Indian Express",
      url: "https://indianexpress.com",
      type: "JOURNALISTIC" as const,
      reliabilityTier: 2,
      scraperConfig: {
        scope: { house: null, states: null },
        urlPatterns: [],
        dataTypes: ["news_articles"],
        notes: "Approved journalistic source for admin-cited URLs only. Not scraped automatically in v1.",
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

  console.log("Seed complete: 8 DataSources created.");

  // Seed known family relationships (uses name-based lookup; skips if politicians not found)
  const familyRelationships = [
    {
      fromName: "M. K. Stalin",
      toName: "Kanimozhi",
      type: "SIBLING" as const,
      description: "Both are children of M. Karunanidhi, former Chief Minister of Tamil Nadu",
      sourceUrl: "https://en.wikipedia.org/wiki/M._K._Stalin",
    },
    {
      fromName: "Kanimozhi",
      toName: "M. K. Stalin",
      type: "SIBLING" as const,
      description: "Both are children of M. Karunanidhi, former Chief Minister of Tamil Nadu",
      sourceUrl: "https://en.wikipedia.org/wiki/Kanimozhi",
    },
  ];

  let relationshipsCreated = 0;
  for (const rel of familyRelationships) {
    const from = await prisma.politician.findFirst({
      where: { fullName: { contains: rel.fromName, mode: "insensitive" } },
      select: { id: true },
    });
    const to = await prisma.politician.findFirst({
      where: { fullName: { contains: rel.toName, mode: "insensitive" } },
      select: { id: true },
    });
    if (!from || !to) continue;
    await prisma.politicianRelationship.upsert({
      where: {
        politicianId_relatedPoliticianId_relationshipType: {
          politicianId: from.id,
          relatedPoliticianId: to.id,
          relationshipType: rel.type,
        },
      },
      create: {
        politicianId: from.id,
        relatedPoliticianId: to.id,
        relationshipType: rel.type,
        description: rel.description,
        sourceUrl: rel.sourceUrl,
      },
      update: {},
    });
    relationshipsCreated++;
  }
  if (relationshipsCreated > 0) {
    console.log(`Family relationships seeded: ${relationshipsCreated}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
