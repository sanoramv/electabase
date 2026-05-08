import { SourceBadge } from "./source-badge";

interface CrimeRecord {
  id: string;
  chargeDescription: string;
  ipcSection?: string | null;
  caseStatus: string;
  courtName?: string | null;
  jailTimeDays?: number | null;
  verdictDate?: Date | string | null;
  sourceUrl: string;
}

export function CrimeRecords({ records }: { records: CrimeRecord[] }) {
  if (records.length === 0) return null;

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{r.chargeDescription}</p>
              {r.ipcSection && (
                <p className="text-xs text-gray-500 mt-0.5">IPC Section: {r.ipcSection}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  r.caseStatus === "CONVICTED"
                    ? "bg-red-100 text-red-700"
                    : r.caseStatus === "ACQUITTED"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.caseStatus}
              </span>
              <SourceBadge sourceUrl={r.sourceUrl} label="Crime record source" />
            </div>
          </div>
          {r.courtName && (
            <p className="text-xs text-gray-500 mt-1">Court: {r.courtName}</p>
          )}
          {r.jailTimeDays && r.jailTimeDays > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">Jail time: {r.jailTimeDays} days</p>
          )}
        </div>
      ))}
    </div>
  );
}
