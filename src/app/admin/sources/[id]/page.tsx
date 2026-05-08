"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface DataSource {
  id: string;
  name: string;
  url: string;
  type: string;
  reliabilityTier: number;
  isActive: boolean;
  scraperConfig: {
    scope?: {
      house?: string | null;
      states?: string[] | null;
    };
  } | null;
}

export default function EditSourcePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [source, setSource] = useState<DataSource | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [reliabilityTier, setReliabilityTier] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [scopeStates, setScopeStates] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/sources`)
      .then((r) => r.json())
      .then((data) => {
        const found = (data.sources as DataSource[]).find((s) => s.id === id);
        if (!found) return;
        setSource(found);
        setName(found.name);
        setUrl(found.url);
        setType(found.type);
        setReliabilityTier(found.reliabilityTier);
        setIsActive(found.isActive);
        const states = found.scraperConfig?.scope?.states;
        setScopeStates(Array.isArray(states) ? states.join(", ") : "");
      });
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);

    const statesArray = scopeStates
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const scraperConfig = statesArray.length > 0
      ? { ...source?.scraperConfig, scope: { ...source?.scraperConfig?.scope, states: statesArray } }
      : source?.scraperConfig ?? null;

    const res = await fetch(`/api/admin/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, type, reliabilityTier, isActive, scraperConfig }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
    } else {
      router.push("/admin/sources");
      router.refresh();
    }
    setSaving(false);
  }

  if (!source) return <div className="text-sm text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Data Source</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="max-w-lg space-y-4">
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="URL">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {["GOVERNMENT", "JUDICIAL", "JOURNALISTIC", "NGO", "RTI", "OTHER"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Reliability Tier (1=highest, 3=lowest)">
          <select value={reliabilityTier} onChange={(e) => setReliabilityTier(Number(e.target.value))} className={inputCls}>
            <option value={1}>1 — Official government portal</option>
            <option value={2}>2 — Recognised civic organisation</option>
            <option value={3}>3 — Secondary source</option>
          </select>
        </Field>
        <Field label="Active">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            Enable scraping from this source
          </label>
        </Field>
        <Field label="Lok Sabha Scope — States (comma-separated, empty = all states)">
          <input
            type="text"
            value={scopeStates}
            onChange={(e) => setScopeStates(e.target.value)}
            placeholder="Tamil Nadu, Maharashtra, ..."
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Only applies to Lok Sabha scraper. Controls which state constituencies are scraped.
            Leave empty to scrape all states. Current v1 default: Tamil Nadu only.
          </p>
        </Field>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={() => router.push("/admin/sources")}
            className="px-4 py-2 text-gray-600 text-sm hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
