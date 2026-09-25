import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreAttempt, type Sample } from "@/lib/handMetrics";
import { withApiErrorHandling } from "@/lib/apiHandler";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const patientId = req.nextUrl.searchParams.get("patientId");
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  const attempts = await prisma.attempt.findMany({
    where: {
      ...(patientId ? { patientId } : {}),
      ...(exerciseId ? { exerciseId } : {}),
    },
    include: { exercise: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(attempts);
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { patientId, exerciseId, repsPrescribed, series } = body as {
    patientId: string;
    exerciseId: string;
    repsPrescribed: number;
    series: Sample[];
  };

  if (!patientId || !exerciseId || !series) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const result = scoreAttempt(
    series,
    {
      minValue: exercise.minValue,
      maxValue: exercise.maxValue,
      avgRepMs: exercise.avgRepMs,
      smoothness: exercise.smoothness,
    },
    repsPrescribed ?? exercise.repetitions
  );

  const attempt = await prisma.attempt.create({
    data: {
      patientId,
      exerciseId,
      repsPrescribed: repsPrescribed ?? exercise.repetitions,
      repsCompleted: result.repsCompleted,
      romScore: result.romScore,
      speedScore: result.speedScore,
      smoothnessScore: result.smoothnessScore,
      completionScore: result.completionScore,
      overallScore: result.overallScore,
      repDetails: JSON.stringify(result.reps),
    },
  });

  return NextResponse.json({ ...attempt, breakdown: result }, { status: 201 });
});
