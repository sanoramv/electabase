"use client";

import { useState } from "react";

export function CoverageNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800 flex items-start justify-between gap-3">
      <p>
        <strong>Coverage Notice:</strong> Version 1 covers Rajya Sabha (all
        states, all years) and Lok Sabha from Tamil Nadu only. Lok Sabha
        coverage for other states will be added in future versions.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-blue-400 hover:text-blue-600 flex-shrink-0 text-xs"
        aria-label="Dismiss notice"
      >
        ✕
      </button>
    </div>
  );
}
