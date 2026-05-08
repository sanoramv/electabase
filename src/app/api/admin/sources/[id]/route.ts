import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { sourceUpdateSchema } from "@/lib/validation/schemas";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  await requireAdminSession();
  const { id } = await params;
  const body = await request.json();
  const data = sourceUpdateSchema.parse(body);

  const source = await db.dataSource.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.url && { url: data.url }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.scraperConfig && { scraperConfig: data.scraperConfig as Prisma.InputJsonValue }),
    },
  });

  return NextResponse.json(source);
}
