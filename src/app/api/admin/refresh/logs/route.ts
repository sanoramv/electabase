import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { paginationSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const { searchParams } = request.nextUrl;
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  const [logs, total] = await Promise.all([
    db.refreshLog.findMany({
      orderBy: { triggeredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sourceResults: {
          include: { dataSource: { select: { name: true, url: true } } },
        },
      },
    }),
    db.refreshLog.count(),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
