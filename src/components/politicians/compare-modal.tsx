"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ScoreCard } from "@/components/politician/score-card";

interface ComparedPolitician {
  id: string;
  slug: string;
  fullName: string;
  photoUrl: string | null;
  currentParty: { abbreviation: string } | null;
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

interface CompareModalProps {
  slugs: string[];
  onClose: () => void;
}

export function CompareModal({ slugs, onClose }: CompareModalProps) {
  const [politicians, setPoliticians] = useState<ComparedPolitician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch comparison data
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/compare?ids=${slugs.join(",")}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to load comparison data.");
        } else {
          setPoliticians(data.politicians);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slugs]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl mt-4 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Compare Politicians</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close comparison"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading comparison…
            </div>
          )}

          {error && (
            <p className="text-center py-10 text-red-600 text-sm">{error}</p>
          )}

          {!loading && !error && politicians.length >= 2 && (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[480px] px-2 sm:px-0">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 py-2 pr-4 w-28 sm:w-36">
                        Parameter
                      </th>
                      {politicians.map((p) => (
                        <th key={p.id} className="text-center px-3 py-2 min-w-[140px]">
                          <div className="flex flex-col items-center gap-1.5">
                            {p.photoUrl ? (
                              <Image
                                src={p.photoUrl}
                                alt={p.fullName}
                                width={36}
                                height={36}
                                className="rounded-full object-cover w-9 h-9"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                                {p.fullName[0]}
                              </div>
                            )}
                            <div className="font-medium text-gray-900 text-xs leading-tight">
                              {p.fullName}
                            </div>
                            {p.currentParty && (
                              <div className="text-xs text-gray-500">{p.currentParty.abbreviation}</div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 pr-4 text-xs font-medium text-gray-500">Effectiveness</td>
                      {politicians.map((p) => (
                        <td key={p.id} className="px-3 py-3 text-center">
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
                        <td key={p.id} className="px-3 py-3 text-center">
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
                        <td key={p.id} className="px-3 py-3 text-center text-sm font-medium">
                          {p.crimeRecords.length}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-xs font-medium text-gray-500">Attendance</td>
                      {politicians.map((p) => (
                        <td key={p.id} className="px-3 py-3 text-center text-sm">
                          {p.attendanceRecords.length > 0
                            ? `${Number(p.attendanceRecords[0].attendancePercentage).toFixed(1)}%`
                            : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-xs font-medium text-gray-500">Questions Raised</td>
                      {politicians.map((p) => (
                        <td key={p.id} className="px-3 py-3 text-center text-sm">
                          {p.attendanceRecords.length > 0
                            ? p.attendanceRecords[0].questionsRaised
                            : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-xs font-medium text-gray-500">Debates</td>
                      {politicians.map((p) => (
                        <td key={p.id} className="px-3 py-3 text-center text-sm">
                          {p.attendanceRecords.length > 0
                            ? p.attendanceRecords[0].debatesParticipated
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
