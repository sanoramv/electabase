"use client";

import { useState, useEffect } from "react";

interface AdZone {
  id: string;
  zoneKey: string;
  isEnabled: boolean;
}

export default function AdminAdsPage() {
  const [zones, setZones] = useState<AdZone[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  async function fetchZones() {
    const res = await fetch("/api/admin/ads");
    const data = await res.json();
    setZones(data.zones ?? []);
  }

  async function toggleZone(zoneKey: string, isEnabled: boolean) {
    setSaving(zoneKey);
    await fetch("/api/admin/ads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneKey, isEnabled }),
    });
    await fetchZones();
    setSaving(null);
  }

  useEffect(() => { fetchZones(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ad Zone Management</h1>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Zone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {zones.map((zone) => (
              <tr key={zone.id}>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{zone.zoneKey}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      zone.isEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {zone.isEnabled ? "ON" : "OFF"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleZone(zone.zoneKey, !zone.isEnabled)}
                    disabled={saving === zone.zoneKey}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {saving === zone.zoneKey
                      ? "Saving..."
                      : zone.isEnabled
                        ? "Disable"
                        : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
