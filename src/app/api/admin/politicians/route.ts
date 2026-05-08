import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { politicianCreateSchema, paginationSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const { searchParams } = request.nextUrl;
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  const [politicians, total] = await Promise.all([
    db.politician.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { currentParty: { select: { name: true, abbreviation: true } } },
    }),
    db.politician.count(),
  ]);

  return NextResponse.json({
    politicians,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  await requireAdminSession();

  const body = await request.json();
  const data = politicianCreateSchema.parse(body);

  // Generate a slug from fullName + birthYear
  const birthYear = data.dateOfBirth
    ? new Date(data.dateOfBirth).getFullYear()
    : undefined;
  const baseSlug = data.fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const slug = birthYear ? `${baseSlug}-${birthYear}` : baseSlug;

  const politician = await db.politician.create({
    data: {
      ...data,
      slug,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      isPublished: false,
      isVerified: false,
    },
  });

  return NextResponse.json(politician, { status: 201 });
}
