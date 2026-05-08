"use client";

import { useState, useEffect } from "react";

interface RefreshLog {
  id: string;
  triggeredBy: string;
  triggeredAt: string;
  completedAt: string | null;
  status: string;
  recordsAdded: number;
  recordsUpdated: number;
  sourceResults: Array<{
    id: string;
    status: string;
    recordsScraped: number;
    errorDetail: string | null;
    durationMs: number | null;
    dataSource: { name: string };
  }>;
}

export default function AdminRefreshPage() {
  const [logs, setLogs] = useState<RefreshLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    const res = await fetch("/api/admin/refresh/logs");
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }

  async function triggerRefresh() {
    setTriggering(true);
    await fetch("/api/admin/refresh", { method: "POST" });
    await fetchLogs();
    setTriggering(false);
  }

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Refresh</h1>
        <button
          onClick={triggerRefresh}
          disabled={triggering}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {triggering ? "Running..." : "Run Full Refresh"}
        </button>
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading logs...</p>}

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(log.triggeredAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
                <span className="ml-2 text-xs text-gray-500">{log.triggeredBy}</span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  log.status === "SUCCESS"
                    ? "bg-green-100 text-green-700"
                    : log.status === "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {log.status}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-3">
              +{log.recordsAdded} added · {log.recordsUpdated} updated
            </div>
            <div className="space-y-1">
              {log.sourceResults.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      r.status === "SUCCESS"
                        ? "bg-green-500"
                        : r.status === "FAILED"
                          ? "bg-red-500"
                          : "bg-amber-500"
                    }`}
                  />
                  <span className="font-medium text-gray-700">{r.dataSource.name}</span>
                  <span className="text-gray-500">{r.recordsScraped} records</span>
                  {r.durationMs && (
                    <span className="text-gray-400">{r.durationMs}ms</span>
                  )}
                  {r.errorDetail && (
                    <span className="text-red-600 truncate max-w-xs">{r.errorDetail}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
