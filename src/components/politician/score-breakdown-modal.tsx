"use client";

const EFFECTIVENESS_LABELS: Record<string, { label: string; max: number }> = {
  attendance: { label: "Attendance %", max: 20 },
  questions: { label: "Questions Raised", max: 15 },
  debates: { label: "Debates Participated", max: 15 },
  privateBills: { label: "Private Bills Introduced", max: 20 },
  billsParticipation: { label: "Bills Participation Rate", max: 10 },
  achievements: { label: "Verified Achievements", max: 15 },
  tenureDuration: { label: "Tenure Duration", max: 5 },
};

const CORRUPTION_LABELS: Record<string, { label: string; max: number }> = {
  criminalCases: { label: "Criminal Cases (severity-weighted)", max: 30 },
  convictions: { label: "Convictions", max: 25 },
  jailTime: { label: "Jail Time Served", max: 15 },
  corruptionRecords: { label: "Verified Corruption Records", max: 15 },
  electoralMalpractice: { label: "Electoral Malpractice", max: 10 },
  assetDiscrepancy: { label: "Asset Discrepancy", max: 5 },
};

interface ScoreBreakdownModalProps {
  type: "effectiveness" | "corruption";
  breakdown: Record<string, unknown>;
  algorithmVersion?: string;
  onClose: () => void;
}

export function ScoreBreakdownModal({
  type,
  breakdown,
  algorithmVersion,
  onClose,
}: ScoreBreakdownModalProps) {
  const labels = type === "effectiveness" ? EFFECTIVENESS_LABELS : CORRUPTION_LABELS;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {type === "effectiveness" ? "Effectiveness" : "Corruption"} Score Breakdown
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {algorithmVersion && (
          <p className="text-xs text-gray-400 mb-4">Algorithm: {algorithmVersion}</p>
        )}

        <div className="space-y-3">
          {Object.entries(labels).map(([key, { label, max }]) => {
            const value = Number(breakdown[key] ?? 0);
            const pct = (value / max) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium text-gray-900">
                    {value.toFixed(1)} / {max}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      type === "effectiveness" ? "bg-blue-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Total score:{" "}
            <strong>{Number(breakdown.total ?? 0).toFixed(1)}</strong> / 100.
            All formulas and weights are published on the{" "}
            <a href="/about" className="text-blue-600 underline">
              methodology page
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
