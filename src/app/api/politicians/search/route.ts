import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(1).max(200),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = searchSchema.safeParse({ q: searchParams.get("q") });

  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const { q } = parsed.data;

  // PostgreSQL FTS: convert query to tsquery format
  const tsQuery = q.trim().split(/\s+/).join(" & ");

  const results = await db.$queryRaw<
    Array<{
      id: string;
      slug: string;
      full_name: string;
      photo_url: string | null;
      party_name: string | null;
      party_slug: string | null;
    }>
  >`
    SELECT
      p.id,
      p.slug,
      p.full_name,
      p.photo_url,
      par.name AS party_name,
      par.slug AS party_slug
    FROM politicians p
    LEFT JOIN parties par ON par.id = p.current_party_id
    WHERE p.is_published = true
      AND p.search_vector @@ to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(p.search_vector, to_tsquery('english', ${tsQuery})) DESC
    LIMIT 10
  `;

  return NextResponse.json({
    results: results.map((r) => ({
      id: r.id,
      slug: r.slug,
      fullName: r.full_name,
      photoUrl: r.photo_url,
      party: r.party_name ? { name: r.party_name, slug: r.party_slug } : null,
    })),
  });
}
