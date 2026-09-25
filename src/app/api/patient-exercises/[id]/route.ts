import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.repetitions === "number") data.repetitions = body.repetitions;
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes;
  const assignment = await prisma.patientExercise.update({ where: { id }, data });
  return NextResponse.json(assignment);
}
