import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { CoverageNotice } from "@/components/ui/coverage-notice";

export const metadata = {
  title: "Politicians",
  description: "Browse all politicians in the ElectaBase database.",
};

export default async function PoliticiansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; party?: string; house?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;
  const q = params.q ?? "";

  const where = {
    isPublished: true,
    ...(params.party && { currentParty: { slug: params.party } }),
    ...(params.house && {
      parliamentaryTenures: { some: { house: params.house as "LOK_SABHA" | "RAJYA_SABHA" } },
    }),
  } satisfies Prisma.PoliticianWhereInput;

  const [politicians, total] = await Promise.all([
    db.politician.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        fullName: true,
        photoUrl: true,
        gender: true,
        currentParty: { select: { name: true, abbreviation: true, slug: true } },
        effectivenessScores: {
          orderBy: { computedAt: "desc" },
          take: 1,
          select: { score: true, rankNational: true },
        },
        corruptionScores: {
          orderBy: { computedAt: "desc" },
          take: 1,
          select: { score: true, rankNational: true },
        },
      },
    }),
    db.politician.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CoverageNotice />

      <div className="mt-6 flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Politicians
          <span className="ml-2 text-sm font-normal text-gray-400">
            {total.toLocaleString()} records
          </span>
        </h1>
      </div>

      {/* Search */}
      <form method="get" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Search by name..."
          className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Politicians grid */}
      {politicians.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No published politicians found.</p>
          <p className="text-sm mt-1">
            Run a data refresh from the{" "}
            <Link href="/admin/refresh" className="text-blue-600 underline">
              admin panel
            </Link>{" "}
            to populate data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {politicians.map((p) => (
            <Link
              key={p.slug}
              href={`/politicians/${p.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {p.photoUrl ? (
                  <Image
                    src={p.photoUrl}
                    alt={p.fullName}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-10 h-10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-bold">
                    {p.fullName[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.fullName}</p>
                  {p.currentParty && (
                    <p className="text-xs text-gray-500">{p.currentParty.abbreviation}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Effectiveness</span>
                  <span className="ml-1 font-medium text-blue-600">
                    {p.effectivenessScores[0]
                      ? Number(p.effectivenessScores[0].score).toFixed(1)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Corruption</span>
                  <span className="ml-1 font-medium text-red-600">
                    {p.corruptionScores[0]
                      ? Number(p.corruptionScores[0].score).toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${q ? `&q=${q}` : ""}`}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${q ? `&q=${q}` : ""}`}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
