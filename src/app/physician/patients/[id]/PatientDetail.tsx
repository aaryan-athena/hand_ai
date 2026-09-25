"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PatientDetail as PatientDetailType, Exercise } from "@/lib/types";
import { EXERCISE_LABELS } from "@/lib/handMetrics";
import { format } from "date-fns";

export default function PatientDetail({ patientId, physicianId }: { patientId: string; physicianId: string }) {
  const [patient, setPatient] = useState<PatientDetailType | null>(null);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [assignReps, setAssignReps] = useState(10);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const p = await fetch(`/api/patients/${patientId}`).then((r) => r.json());
    setPatient(p);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    fetch(`/api/exercises?physicianId=${physicianId}`)
      .then((r) => r.json())
      .then(setLibrary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, physicianId]);

  async function assignExercise() {
    if (!selectedExerciseId) return;
    setBusy(true);
    try {
      await fetch("/api/patient-exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, exerciseId: selectedExerciseId, repetitions: assignReps }),
      });
      await reload();
      setSelectedExerciseId("");
    } finally {
      setBusy(false);
    }
  }

  async function updateAssignment(id: string, data: Partial<{ repetitions: number; active: boolean }>) {
    setBusy(true);
    try {
      await fetch(`/api/patient-exercises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (!patient) return <p className="text-slate-400">Loading…</p>;

  const assignedExerciseIds = new Set(patient.assignments.map((a) => a.exerciseId));
  const unassigned = library.filter((ex) => !assignedExerciseIds.has(ex.id));

  // Build chart data: overall score per attempt, grouped by exercise name for separate lines.
  const exerciseNames = Array.from(new Set(patient.attempts.map((a) => a.exercise?.name ?? "Exercise")));
  const chartData = patient.attempts.map((a) => ({
    date: format(new Date(a.createdAt), "MM/dd HH:mm"),
    [a.exercise?.name ?? "Exercise"]: Math.round(a.overallScore),
  }));

  const colors = ["#22d3ee", "#f97316", "#a78bfa", "#4ade80", "#f472b6"];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          {patient.condition && <p className="text-slate-400 text-sm">{patient.condition}</p>}
        </div>
        <Link
          href={`/physician/patients/${patientId}/report`}
          className="shrink-0 px-4 py-2 rounded-lg border border-white/10 hover:border-cyan-400/50 hover:bg-white/5 text-sm font-medium"
        >
          Export Report
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Assigned Exercises</h2>
        <div className="grid gap-3">
          {patient.assignments.map((a) => (
            <div key={a.id} className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium">{a.exercise.name}</div>
                <div className="text-xs text-slate-400">{EXERCISE_LABELS[a.exercise.type]}</div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 flex items-center gap-1">
                  Reps
                  <input
                    type="number"
                    min={1}
                    defaultValue={a.repetitions}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== a.repetitions) updateAssignment(a.id, { repetitions: v });
                    }}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1"
                  />
                </label>
                <button
                  disabled={busy}
                  onClick={() => updateAssignment(a.id, { active: !a.active })}
                  className={`px-3 py-1 rounded text-xs font-medium ${a.active ? "bg-emerald-600/30 text-emerald-300" : "bg-slate-600/30 text-slate-400"}`}
                >
                  {a.active ? "Active" : "Paused"}
                </button>
              </div>
            </div>
          ))}
          {patient.assignments.length === 0 && <p className="text-slate-500 text-sm">No exercises assigned yet.</p>}
        </div>

        <div className="flex gap-2 items-end flex-wrap pt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Add from library</label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm min-w-56"
            >
              <option value="">Select exercise…</option>
              {unassigned.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Reps</label>
            <input
              type="number"
              min={1}
              value={assignReps}
              onChange={(e) => setAssignReps(Number(e.target.value))}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={!selectedExerciseId || busy}
            onClick={assignExercise}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Progress Report</h2>
        {patient.attempts.length === 0 ? (
          <p className="text-slate-500 text-sm">No attempts recorded yet.</p>
        ) : (
          <>
            <div className="h-72 bg-white/5 rounded-lg border border-white/10 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff22" }} />
                  <Legend />
                  {exerciseNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={colors[i % colors.length]}
                      connectNulls
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Exercise</th>
                    <th className="py-2 pr-4">Reps</th>
                    <th className="py-2 pr-4">ROM</th>
                    <th className="py-2 pr-4">Speed</th>
                    <th className="py-2 pr-4">Smoothness</th>
                    <th className="py-2 pr-4">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {[...patient.attempts].reverse().map((a) => (
                    <tr key={a.id} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-slate-400">{format(new Date(a.createdAt), "MMM d, HH:mm")}</td>
                      <td className="py-2 pr-4">{a.exercise?.name}</td>
                      <td className="py-2 pr-4">{a.repsCompleted}/{a.repsPrescribed}</td>
                      <td className="py-2 pr-4">{Math.round(a.romScore)}</td>
                      <td className="py-2 pr-4">{Math.round(a.speedScore)}</td>
                      <td className="py-2 pr-4">{Math.round(a.smoothnessScore)}</td>
                      <td className="py-2 pr-4 font-semibold text-cyan-400">{Math.round(a.overallScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
