import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { CoverageNotice } from "@/components/ui/coverage-notice";
import { PoliticiansClient } from "@/components/politicians/politicians-client";

export const metadata = {
  title: "Politicians",
  description: "Browse all politicians in the ElectaBase database.",
};

export default async function PoliticiansPage() {
  const [parties, electionStates] = await Promise.all([
    db.party.findMany({
      select: { name: true, abbreviation: true, slug: true },
      orderBy: { name: "asc" },
    }),
    db.electionContest.findMany({
      select: { state: true },
      distinct: ["state"],
    }),
  ]);

  const states = electionStates
    .map((e) => e.state)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CoverageNotice />

      <div className="mt-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Politicians</h1>
        <p className="text-sm text-gray-400 mt-1">
          Check up to 4 politicians then tap <strong>Compare Selected</strong> to compare side-by-side.
        </p>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400">Loading...</div>}>
        <PoliticiansClient parties={parties} states={states} />
      </Suspense>
    </div>
  );
}
