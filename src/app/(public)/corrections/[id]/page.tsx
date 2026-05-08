import { db } from "@/lib/db/client";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function CorrectionStatusPage({ params }: Props) {
  const { id } = await params;

  const submission = await db.correctionSubmission.findUnique({
    where: { id },
    select: { id: true, status: true, createdAt: true },
  });

  if (!submission) notFound();

  const statusColors = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Correction Status</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-xs text-gray-500 mb-2">ID: {submission.id}</p>
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            statusColors[submission.status]
          }`}
        >
          {submission.status}
        </span>
        <p className="mt-3 text-xs text-gray-400">
          Submitted: {new Date(submission.createdAt).toLocaleDateString("en-IN")}
        </p>
        {submission.status === "PENDING" && (
          <p className="mt-3 text-sm text-gray-600">
            Your correction is under admin review. No action required.
          </p>
        )}
        {submission.status === "APPROVED" && (
          <p className="mt-3 text-sm text-green-700">
            Your correction was approved and applied to the database.
          </p>
        )}
        {submission.status === "REJECTED" && (
          <p className="mt-3 text-sm text-red-700">
            Your correction was reviewed and not applied. This may be because
            the suggested value could not be verified against authentic sources.
          </p>
        )}
      </div>
    </div>
  );
}
