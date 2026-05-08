import { db } from "@/lib/db/client";

export const metadata = { title: "Corrections Review" };

export default async function AdminCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filterStatus = (status as "PENDING" | "APPROVED" | "REJECTED") || "PENDING";

  const submissions = await db.correctionSubmission.findMany({
    where: { status: filterStatus },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      politician: { select: { fullName: true, slug: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Corrections</h1>

      <div className="flex gap-2 mb-6">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              filterStatus === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {submissions.length === 0 && (
          <p className="text-gray-500 text-sm">No {filterStatus.toLowerCase()} corrections.</p>
        )}
        {submissions.map((sub) => (
          <div key={sub.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-medium text-gray-900 text-sm">
                  {sub.politician.fullName}
                </span>
                <span className="text-gray-400 text-xs ml-2">·</span>
                <span className="text-gray-500 text-xs ml-2">{sub.fieldInQuestion}</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(sub.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs mb-3">
              <div>
                <p className="text-gray-500 font-medium">Current</p>
                <p className="text-gray-700 mt-0.5">{sub.currentValue}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Suggested</p>
                <p className="text-gray-700 mt-0.5">{sub.suggestedValue}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              <span className="font-medium">Reason:</span> {sub.reason}
            </p>
            {sub.evidenceUrl && (
              <a
                href={sub.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline block mb-2"
              >
                Evidence link →
              </a>
            )}
            {sub.submittedByEmail && (
              <p className="text-xs text-gray-400">
                From: {sub.submittedByEmail}
              </p>
            )}
            {filterStatus === "PENDING" && (
              <div className="flex gap-2 mt-3">
                <form action={`/api/admin/corrections/${sub.id}/approve`} method="post">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                </form>
                <form action={`/api/admin/corrections/${sub.id}/reject`} method="post">
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
        ))}
      </div>
    </div>
  );
}
