"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface PoliticianSummary {
  id: string;
  slug: string;
  fullName: string;
  photoUrl: string | null;
  gender: string | null;
  currentParty: { name: string; abbreviation: string; slug: string } | null;
  effectivenessScores: Array<{ score: { toString(): string } | string | number; rankNational: number | null }>;
  corruptionScores: Array<{ score: { toString(): string } | string | number; rankNational: number | null }>;
}

export function CompareSelector({ politicians }: { politicians: PoliticianSummary[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else if (next.size < 4) {
        next.add(slug);
      }
      return next;
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {politicians.map((p) => (
          <div
            key={p.slug}
            className={`relative bg-white border rounded-lg p-4 transition-all ${
              selected.has(p.slug)
                ? "border-blue-400 shadow-sm ring-1 ring-blue-400"
                : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
            }`}
          >
            {/* Checkbox */}
            <label className="absolute top-3 right-3 cursor-pointer z-10">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={selected.has(p.slug)}
                onChange={() => toggle(p.slug)}
                aria-label={`Select ${p.fullName} for comparison`}
                disabled={!selected.has(p.slug) && selected.size >= 4}
              />
            </label>

            <Link href={`/politicians/${p.slug}`} className="block">
              <div className="flex items-center gap-3 mb-3 pr-6">
                {p.photoUrl ? (
                  <Image
                    src={p.photoUrl}
                    alt={p.fullName}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-10 h-10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-bold flex-shrink-0">
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
          </div>
        ))}
      </div>

      {/* Sticky "Compare Selected" bar — shown when 2–4 are checked */}
      {selected.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selected.size}</span> politicians
              selected{selected.size < 4 && (
                <span className="text-gray-400 ml-1">(up to 4)</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
              >
                Clear
              </button>
              <button
                onClick={() =>
                  router.push(`/compare?ids=${[...selected].join(",")}`)
                }
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 min-h-[44px]"
              >
                Compare Selected →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
