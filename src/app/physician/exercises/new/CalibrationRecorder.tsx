"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HandCamera from "@/components/HandCamera";
import {
  EXERCISE_LABELS,
  EXERCISE_DESCRIPTIONS,
  detectCycles,
  type ExerciseType,
  type Sample,
} from "@/lib/handMetrics";
import { fetchJson } from "@/lib/fetchJson";

const TYPES: ExerciseType[] = ["FIST_CURL", "FINGER_SPREAD", "THUMB_OPPOSITION"];

export default function CalibrationRecorder({ physicianId }: { physicianId: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<ExerciseType>("FIST_CURL");
  const [description, setDescription] = useState("");
  const [repetitions, setRepetitions] = useState(10);
  const [hand, setHand] = useState<"RIGHT" | "LEFT">("RIGHT");

  const [recording, setRecording] = useState(false);
  const [series, setSeries] = useState<Sample[]>([]);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const seriesRef = useRef<Sample[]>([]);

  const detectedCycles = useMemo(() => detectCycles(series), [series]);

  function handleMetric(value: number, timestampMs: number) {
    setCurrentValue(value);
    if (!recording) return;
    if (startTimeRef.current === null) startTimeRef.current = timestampMs;
    const t = timestampMs - startTimeRef.current;
    seriesRef.current = [...seriesRef.current, { t, v: value }];
    setSeries(seriesRef.current);
  }

  function startRecording() {
    seriesRef.current = [];
    startTimeRef.current = null;
    setSeries([]);
    setErrorMsg(null);
    setRecording(true);
  }

  function stopRecording() {
    setRecording(false);
  }

  async function submit() {
    if (!name.trim()) {
      setErrorMsg("Give the exercise a name first.");
      return;
    }
    if (series.length < 10) {
      setErrorMsg("Record a demonstration first (perform the reps in front of the camera).");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await fetchJson("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || EXERCISE_DESCRIPTIONS[type],
          physicianId,
          repetitions,
          hand,
          series,
        }),
      });
      router.push("/physician");
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Calibrate a New Exercise</h1>
      <p className="text-slate-400 text-sm">
        Perform the exercise yourself in front of the webcam for the full prescribed repetitions.
        The system measures your range of motion, tempo, and smoothness to set the patient scoring
        threshold.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Exercise name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning fist pumps"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Movement type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {EXERCISE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Prescribed repetitions</label>
          <input
            type="number"
            min={1}
            value={repetitions}
            onChange={(e) => setRepetitions(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Hand</label>
          <select
            value={hand}
            onChange={(e) => setHand(e.target.value as "RIGHT" | "LEFT")}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="RIGHT">Right</option>
            <option value="LEFT">Left</option>
          </select>
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs text-slate-400">Instructions for patient (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={EXERCISE_DESCRIPTIONS[type]}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <HandCamera exerciseType={type} active={true} onMetric={handleMetric} />

        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            Live metric: <span className="text-slate-200 font-mono">{currentValue?.toFixed(3) ?? "—"}</span>
          </div>
          <div className="text-sm text-slate-400">
            Detected reps: <span className="text-slate-200 font-mono">{detectedCycles.length}</span>
          </div>
        </div>

        {!recording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 font-medium"
          >
            ● Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 rounded-lg bg-slate-600 hover:bg-slate-500 font-medium"
          >
            ■ Stop Recording
          </button>
        )}
      </div>

      {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}

      <div className="flex justify-end gap-3">
        <button
          onClick={submit}
          disabled={submitting || recording}
          className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Exercise & Calibrate"}
        </button>
      </div>
    </div>
  );
}
