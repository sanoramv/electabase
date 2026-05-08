interface SourceScrapeStatusProps {
  name: string;
  status: string;
  recordsScraped: number;
  errorDetail?: string | null;
  durationMs?: number | null;
}

export function SourceScrapeStatus({
  name,
  status,
  recordsScraped,
  errorDetail,
  durationMs,
}: SourceScrapeStatusProps) {
  const dotColor =
    status === "SUCCESS"
      ? "bg-green-500"
      : status === "FAILED"
        ? "bg-red-500"
        : "bg-amber-500";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="font-medium text-gray-700">{name}</span>
      <span className="text-gray-500">{recordsScraped} records</span>
      {durationMs && <span className="text-gray-400">{durationMs}ms</span>}
      {errorDetail && (
        <span className="text-red-600 truncate max-w-xs">{errorDetail}</span>
      )}
    </div>
  );
}
