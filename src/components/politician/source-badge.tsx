interface SourceBadgeProps {
  sourceUrl: string;
  label?: string;
}

export function SourceBadge({ sourceUrl, label = "Source" }: SourceBadgeProps) {
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
