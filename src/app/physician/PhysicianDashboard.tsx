"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Physician, Patient, Exercise } from "@/lib/types";
import { EXERCISE_LABELS } from "@/lib/handMetrics";
import { fetchJson } from "@/lib/fetchJson";
import ErrorNotice from "@/components/ErrorNotice";

const STORAGE_KEY = "handrehab_physician_id";

export default function PhysicianDashboard() {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [physicianId, setPhysicianId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tab, setTab] = useState<"patients" | "exercises">("patients");

  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientCondition, setNewPatientCondition] = useState("");

  useEffect(() => {
    fetchJson<Physician[]>("/api/physicians")
      .then((data) => {
        setPhysicians(data);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && data.some((p) => p.id === stored)) setPhysicianId(stored);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!physicianId) return;
    localStorage.setItem(STORAGE_KEY, physicianId);
    Promise.all([
      fetchJson<Patient[]>(`/api/patients?physicianId=${physicianId}`).then(setPatients),
      fetchJson<Exercise[]>(`/api/exercises?physicianId=${physicianId}`).then(setExercises),
    ]).catch((e: Error) => setError(e.message));
  }, [physicianId]);

  async function createPhysician() {
    if (!newName.trim()) return;
    try {
      const p = await fetchJson<Physician>("/api/physicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setPhysicians((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
      setPhysicianId(p.id);
      setNewName("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function createPatient() {
    if (!newPatientName.trim() || !physicianId) return;
    try {
      const p = await fetchJson<Patient>("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPatientName.trim(),
          condition: newPatientCondition.trim() || null,
          physicianId,
        }),
      });
      setPatients((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPatientName("");
      setNewPatientCondition("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error) return <ErrorNotice message={error} />;

  if (!physicianId) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Physician Login</h1>
        <p className="text-slate-400 text-sm">No password needed — just pick your name or add yourself.</p>

        {physicians.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Select your profile</label>
            <div className="flex flex-col gap-2">
              {physicians.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPhysicianId(p.id)}
                  className="text-left px-4 py-2 rounded-lg border border-white/10 hover:border-cyan-400/50 hover:bg-white/5"
                >
                  Dr. {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t border-white/10">
          <label className="text-sm text-slate-400">Add new physician</label>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={createPhysician}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  const physician = physicians.find((p) => p.id === physicianId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dr. {physician?.name}</h1>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setPhysicianId(null);
          }}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Switch profile
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setTab("patients")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "patients" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400"}`}
        >
          Patients ({patients.length})
        </button>
        <button
          onClick={() => setTab("exercises")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "exercises" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400"}`}
        >
          Exercise Library ({exercises.length})
        </button>
      </div>

      {tab === "patients" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Patient name</label>
              <input
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Condition (optional)</label>
              <input
                value={newPatientCondition}
                onChange={(e) => setNewPatientCondition(e.target.value)}
                placeholder="e.g. Post-stroke left hand weakness"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-64"
              />
            </div>
            <button
              onClick={createPatient}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium"
            >
              Add patient
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/physician/patients/${p.id}`}
                className="rounded-lg border border-white/10 bg-white/5 p-4 hover:border-cyan-400/50"
              >
                <div className="font-medium">{p.name}</div>
                {p.condition && <div className="text-sm text-slate-400">{p.condition}</div>}
              </Link>
            ))}
            {patients.length === 0 && <p className="text-slate-500 text-sm">No patients yet.</p>}
          </div>
        </div>
      )}

      {tab === "exercises" && (
        <div className="space-y-4">
          <Link
            href="/physician/exercises/new"
            className="inline-block px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium"
          >
            + Calibrate new exercise
          </Link>
          <div className="grid sm:grid-cols-2 gap-3">
            {exercises.map((ex) => (
              <div key={ex.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="font-medium">{ex.name}</div>
                <div className="text-xs text-slate-400 mb-2">{EXERCISE_LABELS[ex.type]}</div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>Reps: {ex.repetitions}</div>
                  <div>ROM range: {ex.minValue.toFixed(2)} – {ex.maxValue.toFixed(2)}</div>
                  <div>Avg rep time: {(ex.avgRepMs / 1000).toFixed(1)}s</div>
                </div>
              </div>
            ))}
            {exercises.length === 0 && <p className="text-slate-500 text-sm">No exercises calibrated yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
