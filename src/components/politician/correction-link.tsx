interface CorrectionLinkProps {
  politicianId: string;
  fieldName: string;
}

export function CorrectionLink({ politicianId, fieldName }: CorrectionLinkProps) {
  return (
    <a
      href={`/corrections?politicianId=${politicianId}&field=${encodeURIComponent(fieldName)}`}
      className="text-xs text-gray-400 hover:text-gray-600 ml-1"
      title="Suggest a correction for this data point"
      aria-label={`Suggest correction for ${fieldName}`}
    >
      ✏️
    </a>
  );
}
