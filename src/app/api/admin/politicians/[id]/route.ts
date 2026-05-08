import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { politicianUpdateSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  await requireAdminSession();
  const { id } = await params;
  const body = await request.json();
  const data = politicianUpdateSchema.parse(body);

  const politician = await db.politician.update({
    where: { id },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
  });

  return NextResponse.json(politician);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  await requireAdminSession();
  const { id } = await params;

  await db.politician.update({
    where: { id },
    data: { isPublished: false },
  });

  return NextResponse.json({ success: true });
}
