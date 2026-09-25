import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calibrateFromSeries, type Sample } from "@/lib/handMetrics";

export async function GET(req: NextRequest) {
  const physicianId = req.nextUrl.searchParams.get("physicianId");
  const exercises = await prisma.exercise.findMany({
    where: physicianId ? { physicianId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(exercises);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, description, physicianId, repetitions, hand, series } = body as {
    name: string;
    type: "FIST_CURL" | "FINGER_SPREAD" | "THUMB_OPPOSITION";
    description?: string;
    physicianId: string;
    repetitions: number;
    hand?: "RIGHT" | "LEFT";
    series: Sample[];
  };

  if (!name?.trim() || !type || !physicianId || !series?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const thresholds = calibrateFromSeries(series);
  if (!thresholds) {
    return NextResponse.json(
      { error: "Could not detect any repetitions in the recording. Please re-record with clearer, fuller movements." },
      { status: 422 }
    );
  }

  const exercise = await prisma.exercise.create({
    data: {
      name: name.trim(),
      type,
      description: description?.trim() || null,
      physicianId,
      repetitions: repetitions ?? 10,
      hand: hand ?? "RIGHT",
      minValue: thresholds.minValue,
      maxValue: thresholds.maxValue,
      avgRepMs: thresholds.avgRepMs,
      smoothness: thresholds.smoothness,
      calibratedAt: new Date(),
    },
  });

  return NextResponse.json(exercise, { status: 201 });
}
