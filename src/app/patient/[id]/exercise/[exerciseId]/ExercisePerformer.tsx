"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HandCamera from "@/components/HandCamera";
import {
  EXERCISE_LABELS,
  detectCycles,
  type ExerciseType,
} from "@/lib/handMetrics";
import type { Exercise, PatientDetail } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";
import ErrorNotice from "@/components/ErrorNotice";

type Props = {
  patientId: string;
  exerciseId: string;
};

type Sample = { t: number; v: number };

type ScoreResult = {
  repsCompleted: number;
  romScore: number;
  speedScore: number;
  smoothnessScore: number;
  completionScore: number;
  overallScore: number;
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function ExercisePerformer({ patientId, exerciseId }: Props) {
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [prescribedReps, setPrescribedReps] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  const [recording, setRecording] = useState(false);
  const [series, setSeries] = useState<Sample[]>([]);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const seriesRef = useRef<Sample[]>([]);

  useEffect(() => {
    Promise.all([
      fetchJson<Exercise>(`/api/exercises/${exerciseId}`),
      fetchJson<PatientDetail>(`/api/patients/${patientId}`),
    ])
      .then(([ex, patient]) => {
        setExercise(ex);
        const assignment = patient.assignments.find((a) => a.exerciseId === exerciseId);
        setPrescribedReps(assignment?.repetitions ?? ex.repetitions);
      })
      .catch((e: Error) => setErrorMsg(e.message))
      .finally(() => setLoading(false));
  }, [exerciseId, patientId]);

  const liveCycles = useMemo(() => {
    if (!exercise) return [];
    const range = exercise.maxValue - exercise.minValue;
    const low = exercise.minValue + 0.25 * range;
    const high = exercise.maxValue - 0.25 * range;
    return detectCycles(series, { low, high });
  }, [series, exercise]);

  function handleMetric(value: number, timestampMs: number) {
    setCurrentValue(value);
    if (!recording) return;
    if (startTimeRef.current === null) startTimeRef.current = timestampMs;
    const t = timestampMs - startTimeRef.current;
    seriesRef.current = [...seriesRef.current, { t, v: value }];
    setSeries(seriesRef.current);
  }

  function startExercise() {
    seriesRef.current = [];
    startTimeRef.current = null;
    setSeries([]);
    setResult(null);
    setErrorMsg(null);
    setRecording(true);
  }

  async function finishExercise() {
    setRecording(false);
    if (series.length < 5) {
      setErrorMsg("Not enough movement recorded. Try again and make sure your hand is visible.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const data = await fetchJson<{ breakdown: ScoreResult }>("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, exerciseId, repsPrescribed: prescribedReps, series }),
      });
      setResult(data.breakdown);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!exercise) return <ErrorNotice message={errorMsg ?? "Could not load this exercise."} />;

  const range = exercise.maxValue - exercise.minValue || 1;
  const gaugePct = currentValue !== null ? Math.min(1, Math.max(0, (currentValue - exercise.minValue) / range)) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
        <p className="text-slate-400 text-sm">{EXERCISE_LABELS[exercise.type as ExerciseType]}</p>
        {exercise.description && <p className="text-slate-400 text-sm mt-1">{exercise.description}</p>}
      </div>

      {!result ? (
        <div className="flex flex-col items-center gap-4">
          <HandCamera
            exerciseType={exercise.type as ExerciseType}
            active={true}
            onMetric={handleMetric}
            overlayColor="#fb923c"
          />

          <div className="w-full max-w-xl space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Closed / Contracted</span>
              <span>Open / Extended</span>
            </div>
            <div className="relative h-4 rounded-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-orange-500/70 transition-all"
                style={{ width: `${gaugePct * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              Reps: <span className="font-mono text-lg text-orange-400">{liveCycles.length}</span>
              <span className="text-slate-500"> / {prescribedReps}</span>
            </div>
          </div>

          {!recording ? (
            <button
              onClick={startExercise}
              className="px-8 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 font-semibold"
            >
              Start Exercise
            </button>
          ) : (
            <button
              onClick={finishExercise}
              disabled={submitting}
              className="px-8 py-3 rounded-lg bg-slate-600 hover:bg-slate-500 font-semibold disabled:opacity-50"
            >
              {submitting ? "Scoring…" : "Finish & Get Score"}
            </button>
          )}

          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center rounded-xl border border-white/10 bg-white/5 p-8">
            <div className="text-sm text-slate-400 mb-1">Overall Score</div>
            <div className={`text-6xl font-bold ${scoreColor(result.overallScore)}`}>
              {Math.round(result.overallScore)}
            </div>
            <div className="text-slate-400 mt-2">
              {result.repsCompleted} / {prescribedReps} reps completed
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Range of Motion", result.romScore],
              ["Completion", result.completionScore],
              ["Speed", result.speedScore],
              ["Smoothness", result.smoothnessScore],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <div className={`text-2xl font-bold ${scoreColor(value as number)}`}>{Math.round(value as number)}</div>
                <div className="text-xs text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setResult(null);
                setSeries([]);
              }}
              className="px-5 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push(`/patient/${patientId}`)}
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-sm font-medium"
            >
              Back to My Exercises
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
