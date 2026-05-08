import Link from "next/link";
import { db } from "@/lib/db/client";

export const metadata = { title: "Leaderboards" };

const CATEGORIES = [
  { key: "effectiveness", label: "Most Effective" },
  { key: "corruption", label: "Most Corrupt" },
  { key: "attendance", label: "Best Attendance" },
  { key: "questions", label: "Most Questions" },
  { key: "bills", label: "Most Bills" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; state?: string; party?: string }>;
}) {
  const params = await searchParams;
  const category: Category = (params.category as Category) || "effectiveness";

  const politicians = await db.politician.findMany({
    where: { isPublished: true },
    take: 50,
    select: {
      id: true,
      slug: true,
      fullName: true,
      photoUrl: true,
      currentParty: { select: { name: true, abbreviation: true } },
      effectivenessScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true, rankNational: true } },
      corruptionScores: { orderBy: { computedAt: "desc" }, take: 1, select: { score: true, rankNational: true } },
      attendanceRecords: { orderBy: { year: "desc" }, take: 3 },
    },
  });

  // Sort by category
  const sorted = [...politicians].sort((a, b) => {
    if (category === "effectiveness") {
      return Number(b.effectivenessScores[0]?.score ?? 0) - Number(a.effectivenessScores[0]?.score ?? 0);
    }
    if (category === "corruption") {
      return Number(b.corruptionScores[0]?.score ?? 0) - Number(a.corruptionScores[0]?.score ?? 0);
    }
    const avgA = a.attendanceRecords.reduce((s, r) => s + Number(r.attendancePercentage), 0) / (a.attendanceRecords.length || 1);
    const avgB = b.attendanceRecords.reduce((s, r) => s + Number(r.attendancePercentage), 0) / (b.attendanceRecords.length || 1);
    return avgB - avgA;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leaderboards</h1>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`?category=${c.key}`}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              category === c.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Ranked list */}
      {sorted.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No data yet. Run a data refresh to populate scores.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((p, i) => {
            const score =
              category === "effectiveness"
                ? Number(p.effectivenessScores[0]?.score ?? 0)
                : category === "corruption"
                  ? Number(p.corruptionScores[0]?.score ?? 0)
                  : p.attendanceRecords.reduce((s, r) => s + Number(r.attendancePercentage), 0) / (p.attendanceRecords.length || 1);

            return (
              <Link
                key={p.id}
                href={`/politicians/${p.slug}`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300"
              >
                <span className="text-sm font-bold text-gray-400 w-8">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.fullName}</p>
                  {p.currentParty && (
                    <p className="text-xs text-gray-500">{p.currentParty.abbreviation}</p>
                  )}
                </div>
                <span
                  className={`text-sm font-bold ${
                    category === "corruption" ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {score.toFixed(1)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
