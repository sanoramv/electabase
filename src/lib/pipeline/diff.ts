import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import type { ScrapedPolitician } from "@/lib/scrapers/base";

function generateSlug(fullName: string, birthYear?: number): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return birthYear ? `${base}-${birthYear}` : base;
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const existing = await db.politician.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  if (existing.length === 0) return baseSlug;
  // Check if exact match exists
  const exact = existing.find((p) => p.slug === baseSlug);
  if (!exact) return baseSlug;
  // Generate collision suffix
  for (let n = 2; n <= 99; n++) {
    const candidate = `${baseSlug}-${n}`;
    if (!existing.find((p) => p.slug === candidate)) return candidate;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function upsertPolitician(
  scraped: ScrapedPolitician
): Promise<{ politician: Awaited<ReturnType<typeof db.politician.findFirstOrThrow>>; isNew: boolean }> {
  // Match by exact full_name (case-insensitive) — real impl would use fuzzy matching
  const existing = await db.politician.findFirst({
    where: {
      fullName: { equals: scraped.fullName, mode: "insensitive" },
    },
  });

  if (existing) {
    // Only update fields that have changed
    const updates: Prisma.PoliticianUpdateInput = {};
    if (scraped.photoUrl && scraped.photoUrl !== existing.photoUrl)
      updates.photoUrl = scraped.photoUrl;
    if (scraped.photoSourceUrl && scraped.photoSourceUrl !== existing.photoSourceUrl)
      updates.photoSourceUrl = scraped.photoSourceUrl;

    if (Object.keys(updates).length > 0) {
      await db.politician.update({ where: { id: existing.id }, data: updates });
    }
    return { politician: existing, isNew: false };
  }

  // New politician — create with is_verified:false, is_published:false
  const birthYear = scraped.dateOfBirth
    ? new Date(scraped.dateOfBirth).getFullYear()
    : undefined;
  const baseSlug = generateSlug(scraped.fullName, birthYear);
  const slug = await ensureUniqueSlug(baseSlug);

  const politician = await db.politician.create({
    data: {
      fullName: scraped.fullName,
      displayName: scraped.displayName ?? scraped.fullName,
      slug,
      photoUrl: scraped.photoUrl,
      photoSourceUrl: scraped.photoSourceUrl,
      dateOfBirth: scraped.dateOfBirth ? new Date(scraped.dateOfBirth) : undefined,
      placeOfBirth: scraped.placeOfBirth,
      gender: scraped.gender,
      highestEducation: scraped.highestEducation,
      isVerified: false,
      isPublished: false,
    },
  });

  return { politician, isNew: true };
}
