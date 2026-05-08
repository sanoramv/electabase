interface CorrectionReviewCardProps {
  id: string;
  politician: { fullName: string; slug: string };
  fieldInQuestion: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  evidenceUrl: string | null;
  submittedByEmail: string | null;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export function CorrectionReviewCard({
  id,
  politician,
  fieldInQuestion,
  currentValue,
  suggestedValue,
  reason,
  evidenceUrl,
  submittedByEmail,
  createdAt,
  status,
}: CorrectionReviewCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-medium text-gray-900 text-sm">{politician.fullName}</span>
          <span className="text-gray-400 text-xs ml-2">·</span>
          <span className="text-gray-500 text-xs ml-2">{fieldInQuestion}</span>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString("en-IN")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs mb-3">
        <div>
          <p className="text-gray-500 font-medium">Current</p>
          <p className="text-gray-700 mt-0.5">{currentValue}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Suggested</p>
          <p className="text-gray-700 mt-0.5">{suggestedValue}</p>
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-2">
        <span className="font-medium">Reason:</span> {reason}
      </p>

      {evidenceUrl && (
        <a
          href={evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline block mb-2"
        >
          Evidence link →
        </a>
      )}

      {submittedByEmail && (
        <p className="text-xs text-gray-400">From: {submittedByEmail}</p>
      )}

      {status === "PENDING" && (
        <div className="flex gap-2 mt-3">
          <form action={`/api/admin/corrections/${id}/approve`} method="post">
            <button
              type="submit"
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
            >
              Approve
            </button>
          </form>
          <form action={`/api/admin/corrections/${id}/reject`} method="post">
            <button
              type="submit"
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
