"use client";

import { useState } from "react";

export default function AdminScoresPage() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRecalculate() {
    setRunning(true);
    setMessage(null);
    const res = await fetch("/api/admin/scores/recalculate-all", { method: "POST" });
    const data = await res.json();
    setMessage(data.message ?? "Started");
    setRunning(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Score Management</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Recalculate All Scores</h2>
        <p className="text-xs text-gray-500 mb-4">
          Recalculates Effectiveness and Corruption scores for all published
          politicians using the latest data. Runs in the background — returns
          immediately.
        </p>
        <button
          onClick={handleRecalculate}
          disabled={running}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Starting..." : "Recalculate All Scores"}
        </button>
        {message && (
          <p className="mt-3 text-xs text-green-600">{message}</p>
        )}
      </div>
    </div>
  );
}
