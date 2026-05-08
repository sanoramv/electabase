import { db } from "@/lib/db/client";
import Link from "next/link";

export const metadata = { title: "Data Sources" };

function getScopeBadge(scraperConfig: unknown): string {
  const config = scraperConfig as {
    scope?: { house?: string | null; states?: string[] | null };
  } | null;
  const house = config?.scope?.house;
  const states = config?.scope?.states;

  if (!house && !states) return "All Data";
  const houseLabel = house === "LOK_SABHA" ? "Lok Sabha" : house === "RAJYA_SABHA" ? "Rajya Sabha" : "All Houses";
  const statesLabel = states ? states.join(", ") : "All States";
  return `${houseLabel} · ${statesLabel}`;
}

export default async function AdminSourcesPage() {
  const sources = await db.dataSource.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Data Sources</h1>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Scope</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sources.map((source) => (
              <tr key={source.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{source.name}</div>
                  <div className="text-xs text-gray-400">{source.url}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{source.type}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {getScopeBadge(source.scraperConfig)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      source.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {source.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/sources/${source.id}`}
                    className="text-xs text-blue-600 hover:underline mr-3"
                  >
                    Edit
                  </Link>
                  <form
                    action={`/api/admin/refresh/${source.id}`}
                    method="post"
                    className="inline"
                  >
                    <button
                      type="submit"
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Trigger Scrape
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
