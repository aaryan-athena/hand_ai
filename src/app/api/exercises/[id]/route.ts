import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calibrateFromSeries, type Sample } from "@/lib/handMetrics";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exercise);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.repetitions === "number") data.repetitions = body.repetitions;

  // Optional re-calibration: physician re-records the demonstration.
  if (Array.isArray(body.series) && body.series.length > 0) {
    const thresholds = calibrateFromSeries(body.series as Sample[]);
    if (!thresholds) {
      return NextResponse.json(
        { error: "Could not detect any repetitions in the recording." },
        { status: 422 }
      );
    }
    data.minValue = thresholds.minValue;
    data.maxValue = thresholds.maxValue;
    data.avgRepMs = thresholds.avgRepMs;
    data.smoothness = thresholds.smoothness;
    data.calibratedAt = new Date();
  }

  const exercise = await prisma.exercise.update({ where: { id }, data });
  return NextResponse.json(exercise);
}
