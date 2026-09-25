import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/apiHandler";

export const GET = withApiErrorHandling(async () => {
  const physicians = await prisma.physician.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(physicians);
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const physician = await prisma.physician.create({ data: { name } });
  return NextResponse.json(physician, { status: 201 });
});
