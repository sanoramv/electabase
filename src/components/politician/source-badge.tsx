interface SourceBadgeProps {
  sourceUrl: string | null | undefined;
  label?: string;
}

export function SourceBadge({ sourceUrl, label = "Source" }: SourceBadgeProps) {
  if (!sourceUrl) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400 italic" title="Source unavailable">
        No source
      </span>
    );
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
      aria-label={`${label} (opens in new tab)`}
      title={sourceUrl}
    >
      🔗
    </a>
  );
}
