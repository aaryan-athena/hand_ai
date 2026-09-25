import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const physicianId = req.nextUrl.searchParams.get("physicianId");
  const patients = await prisma.patient.findMany({
    where: physicianId ? { physicianId } : undefined,
    orderBy: { name: "asc" },
    include: { physician: true },
  });
  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const condition = body.condition ? String(body.condition) : null;
  const physicianId = body.physicianId ? String(body.physicianId) : null;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const patient = await prisma.patient.create({ data: { name, condition, physicianId } });
  return NextResponse.json(patient, { status: 201 });
}
