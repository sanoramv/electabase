import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { adZoneUpdateSchema } from "@/lib/validation/schemas";
import { revalidateTag } from "next/cache";

export async function GET() {
  await requireAdminSession();
  const zones = await db.adZone.findMany({ orderBy: { zoneKey: "asc" } });
  return NextResponse.json({ zones });
}

export async function PUT(request: NextRequest) {
  const session = await requireAdminSession();
  const body = await request.json();
  const { zoneKey, ...rest } = body as { zoneKey: string } & Record<string, unknown>;
  const { isEnabled } = adZoneUpdateSchema.parse(rest);

  const zone = await db.adZone.update({
    where: { zoneKey },
    data: { isEnabled, updatedBy: session.user.id },
  });

  // Invalidate the ad-zone cache so the AdZone component picks up the change
  revalidateTag("ad-zones", { expire: 0 });

  return NextResponse.json(zone);
}
