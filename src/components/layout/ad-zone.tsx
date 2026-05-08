import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";

const getAdZoneStatus = unstable_cache(
  async (zoneKey: string) => {
    const zone = await db.adZone.findUnique({ where: { zoneKey } });
    return zone?.isEnabled ?? false;
  },
  ["ad-zone-status"],
  { revalidate: 3600, tags: ["ad-zones"] }
);

interface AdZoneProps {
  zoneKey: string;
  className?: string;
}

export async function AdZone({ zoneKey, className }: AdZoneProps) {
  const isEnabled = await getAdZoneStatus(zoneKey);

  if (!isEnabled) return null;

  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-1">Advertisement</p>
      <div
        className="bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs"
        style={{ minHeight: 90 }}
        data-ad-zone={zoneKey}
      >
        {/* AdSense slot — configure publisher ID and slot ID here */}
        Ad zone: {zoneKey}
      </div>
    </div>
  );
}
