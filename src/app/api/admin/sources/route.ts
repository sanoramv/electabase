import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { sourceUpdateSchema } from "@/lib/validation/schemas";
import { Prisma } from "@prisma/client";

export async function GET() {
  await requireAdminSession();
  const sources = await db.dataSource.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  await requireAdminSession();
  const body = await request.json();
  const data = sourceUpdateSchema.parse(body);

  const source = await db.dataSource.create({
    data: {
      name: data.name!,
      url: data.url!,
      type: "GOVERNMENT",
      reliabilityTier: 1,
      scraperConfig: (data.scraperConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      isActive: data.isActive ?? true,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
