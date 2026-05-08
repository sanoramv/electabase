import { SourceBadge } from "./source-badge";

interface AttendanceRecord {
  id: string;
  sessionName: string;
  year: number;
  attendancePercentage: string | number;
  questionsRaised: number;
  debatesParticipated: number;
  privateBillsIntroduced: number;
  sourceUrl: string;
}

export function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-gray-400 italic">No verified records on file.</p>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Session</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Year</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Attendance</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Questions</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Debates</th>
            <th scope="col" className="px-4 py-2 text-left text-xs text-gray-500">Bills</th>
            <th scope="col" className="px-4 py-2 text-xs text-gray-500">Src</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2">{r.sessionName}</td>
              <td className="px-4 py-2 text-gray-600">{r.year}</td>
              <td className="px-4 py-2 font-medium">
                {Number(r.attendancePercentage).toFixed(1)}%
              </td>
              <td className="px-4 py-2 text-gray-600">{r.questionsRaised}</td>
              <td className="px-4 py-2 text-gray-600">{r.debatesParticipated}</td>
              <td className="px-4 py-2 text-gray-600">{r.privateBillsIntroduced}</td>
              <td className="px-4 py-2">
                <SourceBadge sourceUrl={r.sourceUrl} label="Attendance source" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
