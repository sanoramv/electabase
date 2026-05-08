import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About & Methodology",
  description:
    "ElectaBase methodology, scoring formulas, data sources, and mission.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">About ElectaBase</h1>
      <p className="text-gray-600 mb-10">
        India&apos;s authoritative political transparency database. Every
        politician. Every record. Every source.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Mission</h2>
        <p className="text-gray-600">
          ElectaBase is an informational aggregator of publicly available
          political data. Our mission is to make political records searchable,
          comparable, and source-traceable for every Indian citizen. All data is
          sourced from authentic government and civic records with clickable
          source links.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Data Sources</h2>
        <ul className="space-y-2 text-gray-600">
          <li>
            <strong>Election Commission of India (ECI)</strong> — election
            results, constituency data, candidate affidavits
          </li>
          <li>
            <strong>Lok Sabha portal</strong> — member profiles, attendance,
            questions, bills
          </li>
          <li>
            <strong>Rajya Sabha portal</strong> — member profiles, attendance,
            questions, bills
          </li>
          <li>
            <strong>PRS Legislative Research</strong> — legislative
            participation, committee work
          </li>
          <li>
            <strong>ADR (Association for Democratic Reforms)</strong> — criminal
            cases, assets, election affidavits
          </li>
        </ul>
        <p className="text-sm text-gray-500 mt-3">
          Data is refreshed every Sunday at 2:00 AM IST. No data point appears
          publicly without a verified source URL.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Effectiveness Score (effectiveness-v1.0)
        </h2>
        <p className="text-gray-600 mb-4">
          The Effectiveness Score (0–100) measures a politician&apos;s
          parliamentary performance using 7 components. Log-normalization
          prevents gaming by raw quantity.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Component</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Max Points</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Formula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { c: "Attendance %", p: 20, f: "avg_attendance_pct × 0.20" },
                { c: "Questions raised", p: 15, f: "ln-norm(x, p75) × 15" },
                { c: "Debates participated", p: 15, f: "ln-norm(x, p75) × 15" },
                { c: "Private bills introduced", p: 20, f: "ln-norm(x, p75) × 20" },
                { c: "Bills voted on (participation rate)", p: 10, f: "participation_rate × 10" },
                { c: "Verified achievements", p: 15, f: "Σ(weight × multiplier), capped at 15" },
                { c: "Tenure duration", p: 5, f: "min(1.0, years/10) × 5" },
              ].map((row) => (
                <tr key={row.c}>
                  <td className="px-4 py-2 text-gray-700">{row.c}</td>
                  <td className="px-4 py-2 text-gray-600">{row.p}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Achievement category multipliers: LEGISLATION 1.5 · WELFARE 1.2 ·
          INFRASTRUCTURE 1.0 · INTERNATIONAL 1.0 · AWARD 0.5 · OTHER 0.5
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Corruption Score (corruption-v1.0)
        </h2>
        <p className="text-gray-600 mb-4">
          The Corruption Score (0–100) measures verified criminal and corruption
          records. Pending cases carry partial weight (the algorithm does not
          presume guilt). Acquittals reduce the score.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Component</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Max Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { c: "Criminal cases (severity-weighted)", p: 30 },
                { c: "Convictions (convicted cases × 5)", p: 25 },
                { c: "Jail time served (max at 10 years)", p: 15 },
                { c: "Verified corruption records", p: 15 },
                { c: "Electoral malpractice records", p: 10 },
                { c: "Asset discrepancy (binary)", p: 5 },
              ].map((row) => (
                <tr key={row.c}>
                  <td className="px-4 py-2 text-gray-700">{row.c}</td>
                  <td className="px-4 py-2 text-gray-600">{row.p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 overflow-x-auto">
          <p className="text-sm font-medium text-gray-700 mb-2">IPC Severity Tiers</p>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Tier</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Description</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Multiplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { t: "1 — SEVERE", d: "Murder, rape, terrorism, POCSO", m: "3.0×" },
                { t: "2 — SERIOUS", d: "Corruption, fraud, money laundering", m: "2.0×" },
                { t: "3 — MODERATE", d: "Other non-bailable offences", m: "1.5×" },
                { t: "4 — MINOR", d: "Bailable offences", m: "1.0×" },
              ].map((row) => (
                <tr key={row.t}>
                  <td className="px-4 py-2 text-gray-700">{row.t}</td>
                  <td className="px-4 py-2 text-gray-600">{row.d}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Case status modifiers: CONVICTED 1.0 · APPEALING 0.5 · PENDING 0.3 ·
          ACQUITTED −0.2
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Principles</h2>
        <ul className="space-y-2 text-gray-600 text-sm">
          <li>✓ Every data point has a clickable source link</li>
          <li>✓ Scores are deterministic — no AI inference</li>
          <li>✓ Identical methodology for all politicians regardless of party</li>
          <li>✓ Scoring algorithms are versioned and publicly auditable</li>
          <li>✓ No unsourced data appears on the public site</li>
          <li>✓ Correction submissions welcome via the correction form</li>
        </ul>
      </section>
    </div>
  );
}
