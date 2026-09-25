import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      physician: true,
      assignments: { include: { exercise: true }, orderBy: { assignedAt: "desc" } },
      attempts: { include: { exercise: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: { name?: string; condition?: string | null } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.condition === "string" || body.condition === null) data.condition = body.condition;
  const patient = await prisma.patient.update({ where: { id }, data });
  return NextResponse.json(patient);
}
