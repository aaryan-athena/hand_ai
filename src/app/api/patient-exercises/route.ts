import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patientId, exerciseId, repetitions, notes } = body as {
    patientId: string;
    exerciseId: string;
    repetitions?: number;
    notes?: string;
  };
  if (!patientId || !exerciseId) {
    return NextResponse.json({ error: "patientId and exerciseId are required" }, { status: 400 });
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const assignment = await prisma.patientExercise.upsert({
    where: { patientId_exerciseId: { patientId, exerciseId } },
    update: { repetitions: repetitions ?? exercise.repetitions, active: true, notes },
    create: {
      patientId,
      exerciseId,
      repetitions: repetitions ?? exercise.repetitions,
      notes,
    },
  });
  return NextResponse.json(assignment, { status: 201 });
}
