import Link from "next/link";
import { db } from "@/lib/db/client";
import { CoverageNotice } from "@/components/ui/coverage-notice";

export const metadata = {
  title: "ElectaBase — Political Transparency Database",
  description:
    "India's authoritative political transparency database. Every politician. Every record. Every source.",
};

async function getSiteStats() {
  const [totalPoliticians, lastRefresh] = await Promise.all([
    db.politician.count({ where: { isPublished: true } }),
    db.refreshLog.findFirst({ orderBy: { triggeredAt: "desc" } }),
  ]);
  return { totalPoliticians, lastRefresh };
}

async function getLeaderboardSnippets() {
  const topEffective = await db.politician.findMany({
    where: { isPublished: true, effectivenessScores: { some: {} } },
    take: 5,
    select: {
      slug: true,
      fullName: true,
      photoUrl: true,
      currentParty: { select: { abbreviation: true, slug: true } },
      effectivenessScores: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { score: true, rankNational: true },
      },
    },
  });

  const topCorrupt = await db.politician.findMany({
    where: { isPublished: true, corruptionScores: { some: {} } },
    take: 5,
    select: {
      slug: true,
      fullName: true,
      photoUrl: true,
      currentParty: { select: { abbreviation: true, slug: true } },
      corruptionScores: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { score: true, rankNational: true },
      },
    },
  });

  return { topEffective, topCorrupt };
}

export default async function HomePage() {
  const [stats, leaderboards] = await Promise.all([
    getSiteStats(),
    getLeaderboardSnippets(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <CoverageNotice />

      <div className="mt-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Every Politician. Every Record. Every Source.
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          India&apos;s most transparent political database. Searchable records,
          sourced data, and deterministic scores for every contested and serving
          politician.
        </p>
      </div>

      {/* Search bar */}
      <div className="mt-10 max-w-xl mx-auto">
        <form action="/politicians" method="get" className="flex gap-2">
          <input
            name="q"
            type="search"
            placeholder="Search politicians by name, party, or constituency..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-5 py-3 text-sm font-medium hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* Site stats */}
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-2xl mx-auto text-center">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-3xl font-bold text-gray-900">{stats.totalPoliticians.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Published Politicians</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-3xl font-bold text-gray-900">5</p>
          <p className="text-xs text-gray-500 mt-1">Government Sources</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-900">
            {stats.lastRefresh
              ? new Date(stats.lastRefresh.triggeredAt).toLocaleDateString("en-IN")
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Last Data Refresh</p>
        </div>
      </div>

      {/* Leaderboard snippets */}
      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Most Effective</h2>
            <Link href="/leaderboards?category=effectiveness" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {leaderboards.topEffective.map((p, i) => (
              <div
                key={p.slug}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300"
              >
                <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <Link href={`/politicians/${p.slug}`} className="block">
                    <p className="text-sm font-medium text-gray-900 truncate hover:underline cursor-pointer">{p.fullName}</p>
                  </Link>
                  {p.currentParty && (
                    <Link href={`/parties/${p.currentParty.slug}`} className="text-xs text-gray-500 hover:underline">
                      {p.currentParty.abbreviation}
                    </Link>
                  )}
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {Number(p.effectivenessScores[0]?.score ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
            {leaderboards.topEffective.length === 0 && (
              <p className="text-sm text-gray-400 italic">No data yet. Run a data refresh to populate scores.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Highest Corruption Score</h2>
            <Link href="/leaderboards?category=corruption" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {leaderboards.topCorrupt.map((p, i) => (
              <div
                key={p.slug}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-red-200"
              >
                <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <Link href={`/politicians/${p.slug}`} className="block">
                    <p className="text-sm font-medium text-gray-900 truncate hover:underline cursor-pointer">{p.fullName}</p>
                  </Link>
                  {p.currentParty && (
                    <Link href={`/parties/${p.currentParty.slug}`} className="text-xs text-gray-500 hover:underline">
                      {p.currentParty.abbreviation}
                    </Link>
                  )}
                </div>
                <span className="text-sm font-bold text-red-600">
                  {Number(p.corruptionScores[0]?.score ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
            {leaderboards.topCorrupt.length === 0 && (
              <p className="text-sm text-gray-400 italic">No data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
