"use client";

import { useState } from "react";
import { ScoreCard } from "@/components/politician/score-card";

interface Politician {
  id: string;
  slug: string;
  fullName: string;
  photoUrl?: string | null;
  currentParty?: { name: string; abbreviation: string } | null;
  effectivenessScores: Array<{ score: string; rankNational?: number | null }>;
  corruptionScores: Array<{ score: string; rankNational?: number | null }>;
  attendanceRecords: Array<{
    questionsRaised: number;
    debatesParticipated: number;
    privateBillsIntroduced: number;
    attendancePercentage: string;
  }>;
  crimeRecords: Array<{ id: string }>;
  corruptionRecords: Array<{ id: string }>;
}

export default function ComparePage() {
  const [slugInput, setSlugInput] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPolitician() {
    const slug = slugInput.trim();
    if (!slug || selectedSlugs.includes(slug)) return;
    if (selectedSlugs.length >= 4) {
      setError("Maximum 4 politicians can be compared at once.");
      return;
    }

    const newSlugs = [...selectedSlugs, slug];
    setSelectedSlugs(newSlugs);
    setSlugInput("");
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/compare?ids=${newSlugs.join(",")}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setPoliticians(data.politicians);
    }
    setLoading(false);
  }

  function removePolitician(slug: string) {
    const newSlugs = selectedSlugs.filter((s) => s !== slug);
    setSelectedSlugs(newSlugs);
    setPoliticians(politicians.filter((p) => p.slug !== slug));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Compare Politicians</h1>

      {/* Search input */}
      <div className="flex gap-2 mb-4 max-w-lg">
        <input
          type="text"
          value={slugInput}
          onChange={(e) => setSlugInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPolitician()}
          placeholder="Enter politician slug (e.g. narendra-modi-1950)"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addPolitician}
          disabled={selectedSlugs.length >= 4}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-400 text-sm mb-4">Loading...</p>}

      {/* Selected slugs pills */}
      {selectedSlugs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedSlugs.map((slug) => (
            <span
              key={slug}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
            >
              {slug}
              <button
                onClick={() => removePolitician(slug)}
                className="text-blue-400 hover:text-blue-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {politicians.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 py-2 pr-4 w-36">Parameter</th>
                {politicians.map((p) => (
                  <th key={p.id} className="text-center px-4 py-2 min-w-[160px]">
                    <div className="font-medium text-gray-900">{p.fullName}</div>
                    {p.currentParty && (
                      <div className="text-xs text-gray-500">{p.currentParty.abbreviation}</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 pr-4 text-xs font-medium text-gray-500">Effectiveness</td>
                {politicians.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center">
                    <ScoreCard
                      type="effectiveness"
                      score={p.effectivenessScores[0] ? Number(p.effectivenessScores[0].score) : null}
                      rankNational={p.effectivenessScores[0]?.rankNational ?? null}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 text-xs font-medium text-gray-500">Corruption</td>
                {politicians.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center">
                    <ScoreCard
                      type="corruption"
                      score={p.corruptionScores[0] ? Number(p.corruptionScores[0].score) : null}
                      rankNational={p.corruptionScores[0]?.rankNational ?? null}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-4 text-xs font-medium text-gray-500">Crime Records</td>
                {politicians.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center text-sm">{p.crimeRecords.length}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {politicians.length === 0 && selectedSlugs.length === 0 && (
        <p className="text-gray-400 text-sm">
          Enter politician slugs above to compare up to 4 politicians side-by-side.
          You can find a politician&apos;s slug on their profile URL (e.g.{" "}
          <code className="bg-gray-100 px-1 rounded">/politicians/narendra-modi-1950</code>).
        </p>
      )}
    </div>
  );
}
