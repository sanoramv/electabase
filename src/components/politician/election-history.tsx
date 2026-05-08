import { SourceBadge } from "./source-badge";

interface ElectionContest {
  id: string;
  electionYear: number;
  electionType: string;
  constituency: string;
  state: string;
  result: string;
  voteSharePercent?: string | number | null;
  sourceUrl: string;
}

export function ElectionHistory({ contests }: { contests: ElectionContest[] }) {
  if (contests.length === 0) {
    return <p className="text-sm text-gray-400 italic">No verified records on file.</p>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Year</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">House</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Constituency</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">State</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Result</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Vote Share</th>
            <th scope="col" className="px-4 py-2 text-xs text-gray-500">Src</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {contests.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2">{c.electionYear}</td>
              <td className="px-4 py-2 text-gray-600">{c.electionType.replace("_", " ")}</td>
              <td className="px-4 py-2">{c.constituency}</td>
              <td className="px-4 py-2 text-gray-600">{c.state}</td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-medium ${
                    c.result === "WON" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {c.result}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-600">
                {c.voteSharePercent ? `${Number(c.voteSharePercent).toFixed(1)}%` : "—"}
              </td>
              <td className="px-4 py-2">
                <SourceBadge sourceUrl={c.sourceUrl} label="Election contest source" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
