"use client";

import { useState } from "react";
import { ScoreBreakdownModal } from "./score-breakdown-modal";

interface ScoreCardProps {
  type: "effectiveness" | "corruption";
  score: number | null;
  rankNational: number | null;
  rankParty?: number | null;
  rankState?: number | null;
  breakdown?: Record<string, unknown>;
  algorithmVersion?: string;
  insufficientData?: boolean;
}

export function ScoreCard({
  type,
  score,
  rankNational,
  rankParty,
  rankState,
  breakdown,
  algorithmVersion,
  insufficientData,
}: ScoreCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const label = type === "effectiveness" ? "Effectiveness Score" : "Corruption Score";
  const color =
    type === "effectiveness"
      ? "text-blue-600"
      : score && score > 50
        ? "text-red-600"
        : "text-orange-500";

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          {label}
        </h3>
        {insufficientData ? (
          <p className="text-sm text-gray-400 italic">Insufficient Data</p>
        ) : score !== null ? (
          <>
            <button
              onClick={() => setShowBreakdown(true)}
              className={`text-4xl font-bold ${color} hover:opacity-80 cursor-pointer`}
              aria-label={`View ${label} breakdown`}
            >
              {Number(score).toFixed(1)}
            </button>
            <p className="text-xs text-gray-400 mt-1">out of 100 · click for breakdown</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {rankNational && (
                <div>
                  <p className="text-xs font-semibold text-gray-700">#{rankNational}</p>
                  <p className="text-xs text-gray-400">National</p>
                </div>
              )}
              {rankParty && (
                <div>
                  <p className="text-xs font-semibold text-gray-700">#{rankParty}</p>
                  <p className="text-xs text-gray-400">Party</p>
                </div>
              )}
              {rankState && (
                <div>
                  <p className="text-xs font-semibold text-gray-700">#{rankState}</p>
                  <p className="text-xs text-gray-400">State</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">Not yet computed</p>
        )}
      </div>

      {showBreakdown && breakdown && (
        <ScoreBreakdownModal
          type={type}
          breakdown={breakdown}
          algorithmVersion={algorithmVersion}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </>
  );
}
