"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CorrectionForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    politicianId: searchParams.get("politicianId") ?? "",
    fieldInQuestion: searchParams.get("field") ?? "",
    currentValue: "",
    suggestedValue: "",
    reason: "",
    evidenceUrl: "",
    submittedByEmail: "",
    honeypot: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; statusUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return; // Bot detected
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Submission failed. Please try again.");
    } else {
      setSubmitted(data);
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <h2 className="text-lg font-bold text-gray-900">Correction Submitted</h2>
        <p className="mt-2 text-gray-600">
          Your correction has been submitted for admin review. You can track its
          status at:
        </p>
        <a href={submitted.statusUrl} className="block mt-3 text-blue-600 underline break-all">
          {submitted.statusUrl}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — hidden from real users */}
      <input
        type="text"
        name="website"
        value={form.honeypot}
        onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Politician ID
        </label>
        <input
          type="text"
          required
          value={form.politicianId}
          onChange={(e) => setForm({ ...form, politicianId: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="cuid from politician profile"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Field to correct
        </label>
        <input
          type="text"
          required
          value={form.fieldInQuestion}
          onChange={(e) => setForm({ ...form, fieldInQuestion: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. dateOfBirth"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
          <input
            type="text"
            required
            value={form.currentValue}
            onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Value</label>
          <input
            type="text"
            required
            value={form.suggestedValue}
            onChange={(e) => setForm({ ...form, suggestedValue: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
        <textarea
          required
          minLength={10}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Explain why this correction is needed..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Evidence URL (optional)
        </label>
        <input
          type="url"
          value={form.evidenceUrl}
          onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
        <input
          type="email"
          required
          value={form.submittedByEmail}
          onChange={(e) => setForm({ ...form, submittedByEmail: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
        />
        <p className="text-xs text-gray-400 mt-1">
          Used for admin contact only. Permanently anonymised after review per India&apos;s DPDP Act 2023.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white rounded px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Correction"}
      </button>
    </form>
  );
}

export default function CorrectionsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Correction</h1>
      <p className="text-sm text-gray-600 mb-6">
        Spotted incorrect data? Submit a correction for admin review. All
        approved corrections are applied immediately. Max 5 submissions per hour.
      </p>
      <Suspense fallback={<div>Loading form...</div>}>
        <CorrectionForm />
      </Suspense>
    </div>
  );
}
