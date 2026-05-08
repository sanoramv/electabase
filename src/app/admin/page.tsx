import { db } from "@/lib/db/client";
import Link from "next/link";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const [totalPoliticians, pendingCorrections, lastRefresh] = await Promise.all([
    db.politician.count({ where: { isPublished: true } }),
    db.correctionSubmission.count({ where: { status: "PENDING" } }),
    db.refreshLog.findFirst({ orderBy: { triggeredAt: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Published Politicians</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalPoliticians}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Pending Corrections</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pendingCorrections}</p>
          {pendingCorrections > 0 && (
            <Link href="/admin/corrections" className="text-xs text-blue-600 mt-1 block">
              Review →
            </Link>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Last Data Refresh</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {lastRefresh
              ? new Date(lastRefresh.triggeredAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "Never"}
          </p>
          {lastRefresh && (
            <span
              className={`text-xs mt-1 inline-block ${
                lastRefresh.status === "SUCCESS"
                  ? "text-green-600"
                  : lastRefresh.status === "FAILED"
                    ? "text-red-600"
                    : "text-amber-600"
              }`}
            >
              {lastRefresh.status}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <Link
          href="/admin/refresh"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium text-center hover:bg-blue-700"
        >
          Run Refresh
        </Link>
        <Link
          href="/admin/politicians/new"
          className="bg-gray-100 text-gray-700 rounded px-4 py-2 text-sm font-medium text-center hover:bg-gray-200"
        >
          Add Politician
        </Link>
      </div>
    </div>
  );
}
