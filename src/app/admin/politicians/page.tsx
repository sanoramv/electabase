import Link from "next/link";
import { db } from "@/lib/db/client";

export const metadata = { title: "Politicians — Admin" };

export default async function AdminPoliticiansPage() {
  const politicians = await db.politician.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      slug: true,
      fullName: true,
      isPublished: true,
      countryCode: true,
      currentParty: { select: { abbreviation: true } },
      _count: {
        select: {
          electionContests: true,
          crimeRecords: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Politicians</h1>
        <Link
          href="/admin/politicians/new"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + Add Politician
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Party</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Contests</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Crimes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {politicians.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm italic">
                  No politicians yet. Add one or run a data refresh.
                </td>
              </tr>
            )}
            {politicians.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.fullName}</div>
                  <div className="text-xs text-gray-400">{p.slug}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {p.currentParty?.abbreviation ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{p._count.electionContests}</td>
                <td className="px-4 py-3 text-gray-600">{p._count.crimeRecords}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/politicians/${p.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    {p.isPublished && (
                      <Link
                        href={`/politicians/${p.slug}`}
                        target="_blank"
                        className="text-xs text-gray-500 hover:underline"
                      >
                        View
                      </Link>
                    )}
                    <PublishToggle id={p.id} isPublished={p.isPublished} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PublishToggle({ id, isPublished }: { id: string; isPublished: boolean }) {
  return (
    <form
      action={
        isPublished
          ? `/api/admin/politicians/${id}`
          : `/api/admin/politicians/${id}/publish`
      }
      method={isPublished ? "delete" : "post"}
      className="inline"
    >
      {isPublished && <input type="hidden" name="_method" value="DELETE" />}
      <button
        type="submit"
        className={`text-xs ${
          isPublished ? "text-red-500 hover:underline" : "text-green-600 hover:underline"
        }`}
      >
        {isPublished ? "Unpublish" : "Publish"}
      </button>
    </form>
  );
}
