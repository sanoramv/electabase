import Link from "next/link";
import { db } from "@/lib/db/client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Elections",
  description: "Browse Indian parliamentary election contests by year, type, and state.",
};

type SearchParams = Promise<{ year?: string; type?: string; state?: string }>;

export default async function ElectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedYear = params.year ? parseInt(params.year, 10) : undefined;
  const selectedType = params.type ?? undefined;
  const selectedState = params.state ?? undefined;

  const [allContests, yearsRaw] = await Promise.all([
    db.electionContest.findMany({
      where: {
        ...(selectedYear && { electionYear: selectedYear }),
        ...(selectedType && { electionType: selectedType as never }),
        ...(selectedState && { state: selectedState }),
        politician: { isPublished: true },
      },
      orderBy: [{ electionYear: "desc" }, { state: "asc" }, { constituency: "asc" }],
      take: 100,
      select: {
        id: true,
        electionYear: true,
        electionType: true,
        constituency: true,
        state: true,
        result: true,
        voteSharePercent: true,
        sourceUrl: true,
        politician: { select: { slug: true, fullName: true } },
      },
    }),
    db.electionContest.groupBy({
      by: ["electionYear"],
      orderBy: { electionYear: "desc" },
      _count: true,
    }),
  ]);

  const years = yearsRaw.map((r) => r.electionYear);
  const types = ["LOK_SABHA", "RAJYA_SABHA"];
  const statesRaw = await db.electionContest.groupBy({
    by: ["state"],
    orderBy: { state: "asc" },
    _count: true,
  });
  const states = statesRaw.map((r) => r.state).filter(Boolean) as string[];

  const typeLabels: Record<string, string> = {
    LOK_SABHA: "Lok Sabha",
    RAJYA_SABHA: "Rajya Sabha",
    STATE: "State",
    OTHER: "Other",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Elections</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Year</label>
          <div className="flex flex-wrap gap-1">
            <Link
              href={{ pathname: "/elections", query: { ...(selectedType && { type: selectedType }), ...(selectedState && { state: selectedState }) } }}
              className={`px-2 py-1 rounded text-xs ${!selectedYear ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All
            </Link>
            {years.slice(0, 10).map((y) => (
              <Link
                key={y}
                href={{ pathname: "/elections", query: { year: y, ...(selectedType && { type: selectedType }), ...(selectedState && { state: selectedState }) } }}
                className={`px-2 py-1 rounded text-xs ${selectedYear === y ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
          <div className="flex gap-1">
            <Link
              href={{ pathname: "/elections", query: { ...(selectedYear && { year: selectedYear }), ...(selectedState && { state: selectedState }) } }}
              className={`px-2 py-1 rounded text-xs ${!selectedType ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All
            </Link>
            {types.map((t) => (
              <Link
                key={t}
                href={{ pathname: "/elections", query: { type: t, ...(selectedYear && { year: selectedYear }), ...(selectedState && { state: selectedState }) } }}
                className={`px-2 py-1 rounded text-xs ${selectedType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {typeLabels[t]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {allContests.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No election contests match the selected filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Politician</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Year</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">House</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Constituency</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">State</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Result</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Vote %</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allContests.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/politicians/${c.politician.slug}`} className="text-blue-600 hover:underline">
                      {c.politician.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{c.electionYear}</td>
                  <td className="px-4 py-2 text-gray-700">{typeLabels[c.electionType] ?? c.electionType}</td>
                  <td className="px-4 py-2 text-gray-700">{c.constituency}</td>
                  <td className="px-4 py-2 text-gray-700">{c.state}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        c.result === "WON"
                          ? "bg-green-100 text-green-700"
                          : c.result === "LOST"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.result}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.voteSharePercent ? `${Number(c.voteSharePercent).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        aria-label="View source"
                      >
                        🔗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
