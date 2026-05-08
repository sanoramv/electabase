import Link from "next/link";
import { db } from "@/lib/db/client";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Political Parties" };

export default async function PartiesPage() {
  const parties = await db.party.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      abbreviation: true,
      logoUrl: true,
      foundedYear: true,
      ideologyTags: true,
      _count: { select: { currentMembers: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Political Parties</h1>

      {parties.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No party data yet. Run a data refresh to populate records.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {parties.map((party) => (
            <Link
              key={party.id}
              href={`/parties/${party.slug}`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300"
            >
              {party.logoUrl && (
                <img
                  src={party.logoUrl}
                  alt={`${party.name} logo`}
                  className="w-10 h-10 object-contain flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{party.name}</p>
                <p className="text-xs text-gray-500">
                  {party.abbreviation}
                  {party.foundedYear && ` · Est. ${party.foundedYear}`}
                  {" · "}
                  {party._count.currentMembers} member{party._count.currentMembers !== 1 ? "s" : ""}
                </p>
                {Array.isArray(party.ideologyTags) && party.ideologyTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(party.ideologyTags as string[]).slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
