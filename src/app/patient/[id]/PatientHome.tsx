"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PatientDetail } from "@/lib/types";
import { EXERCISE_LABELS } from "@/lib/handMetrics";
import { format } from "date-fns";

export default function PatientHome({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${patientId}`)
      .then((r) => r.json())
      .then(setPatient);
  }, [patientId]);

  if (!patient) return <p className="text-slate-400">Loading…</p>;

  const activeAssignments = patient.assignments.filter((a) => a.active);

  function lastAttemptFor(exerciseId: string) {
    const attempts = patient!.attempts.filter((a) => a.exerciseId === exerciseId);
    return attempts[0]; // attempts are ordered desc from API
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hi, {patient.name} 👋</h1>
          <p className="text-slate-400 text-sm">Here are your exercises for today.</p>
        </div>
        <Link
          href={`/patient/${patientId}/report`}
          className="shrink-0 px-4 py-2 rounded-lg border border-white/10 hover:border-orange-400/50 hover:bg-white/5 text-sm font-medium"
        >
          My Report
        </Link>
      </div>

      <div className="grid gap-3">
        {activeAssignments.map((a) => {
          const last = lastAttemptFor(a.exerciseId);
          return (
            <Link
              key={a.id}
              href={`/patient/${patientId}/exercise/${a.exerciseId}`}
              className="rounded-lg border border-white/10 bg-white/5 p-4 hover:border-orange-400/50 flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-medium">{a.exercise.name}</div>
                <div className="text-xs text-slate-400">{EXERCISE_LABELS[a.exercise.type]} · {a.repetitions} reps</div>
                {last && (
                  <div className="text-xs text-slate-500 mt-1">
                    Last: {Math.round(last.overallScore)} pts on {format(new Date(last.createdAt), "MMM d")}
                  </div>
                )}
              </div>
              <div className="text-2xl text-orange-400">→</div>
            </Link>
          );
        })}
        {activeAssignments.length === 0 && (
          <p className="text-slate-500 text-sm">No exercises assigned yet. Check back after your physician sets some up.</p>
        )}
      </div>
    </div>
  );
}
