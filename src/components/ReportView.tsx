"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { PatientDetail } from "@/lib/types";
import { EXERCISE_LABELS, type RepScore } from "@/lib/handMetrics";
import { downloadCSV } from "@/lib/csv";

type Props = {
  patientId: string;
  /** Controls which back-link / framing copy is shown; content is identical either way. */
  audience: "physician" | "patient";
};

function parseRepDetails(json: string): RepScore[] {
  try {
    return JSON.parse(json) as RepScore[];
  } catch {
    return [];
  }
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function ReportView({ patientId, audience }: Props) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/patients/${patientId}`)
      .then((r) => r.json())
      .then(setPatient);
  }, [patientId]);

  if (!patient) return <p className="text-slate-400 print:hidden">Loading…</p>;

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportSummaryCSV() {
    if (!patient) return;
    const rows = patient.attempts.map((a) => ({
      date: a.createdAt,
      exercise: a.exercise?.name ?? "",
      exerciseType: a.exercise?.type ?? "",
      repsCompleted: a.repsCompleted,
      repsPrescribed: a.repsPrescribed,
      romScore: a.romScore.toFixed(1),
      speedScore: a.speedScore.toFixed(1),
      smoothnessScore: a.smoothnessScore.toFixed(1),
      completionScore: a.completionScore.toFixed(1),
      overallScore: a.overallScore.toFixed(1),
    }));
    downloadCSV(`${patient.name.replace(/\s+/g, "_")}_report_summary.csv`, rows);
  }

  function exportDetailedCSV() {
    if (!patient) return;
    const rows: Record<string, string | number>[] = [];
    for (const a of patient.attempts) {
      const reps = parseRepDetails(a.repDetails);
      reps.forEach((r, i) => {
        rows.push({
          attemptDate: a.createdAt,
          exercise: a.exercise?.name ?? "",
          repNumber: i + 1,
          romAchieved: (r.cycle.maxV - r.cycle.minV).toFixed(4),
          minValue: r.cycle.minV.toFixed(4),
          maxValue: r.cycle.maxV.toFixed(4),
          durationMs: Math.round(r.cycle.durationMs),
          jerk: r.cycle.jerk.toFixed(6),
          romScore: r.romScore.toFixed(1),
          speedScore: r.speedScore.toFixed(1),
          smoothnessScore: r.smoothnessScore.toFixed(1),
        });
      });
    }
    downloadCSV(`${patient.name.replace(/\s+/g, "_")}_report_per_rep.csv`, rows);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 print:text-black">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Progress Report</h1>
          <p className="text-slate-400 text-sm">
            {audience === "physician"
              ? "Full scoring breakdown for this patient, generated from calibrated exercise thresholds."
              : "Your exercise history and how each score was calculated."}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportSummaryCSV}
            className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm"
          >
            Summary CSV
          </button>
          <button
            onClick={exportDetailedCSV}
            className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm"
          >
            Per-rep CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">HandRehab AI — Progress Report</h1>
        <p className="text-sm text-slate-600">Generated {format(new Date(), "MMMM d, yyyy 'at' HH:mm")}</p>
      </div>

      <section className="rounded-lg border border-white/10 print:border-slate-300 bg-white/5 print:bg-white p-4 space-y-1">
        <div className="font-semibold">{patient.name}</div>
        {patient.condition && <div className="text-sm text-slate-400 print:text-slate-600">{patient.condition}</div>}
        {patient.physician && (
          <div className="text-sm text-slate-400 print:text-slate-600">Physician: Dr. {patient.physician.name}</div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How scores are calculated</h2>
        <p className="text-sm text-slate-400 print:text-slate-600">
          Each attempt is scored 0–100 on four parameters, measured against the physician&apos;s
          calibrated demonstration for that exercise, then combined into an overall score:
        </p>
        <ul className="text-sm text-slate-400 print:text-slate-600 list-disc list-inside space-y-0.5">
          <li><strong className="text-slate-200 print:text-black">Range of Motion (40%)</strong> — how much of the physician&apos;s target open↔closed range was reached, per rep.</li>
          <li><strong className="text-slate-200 print:text-black">Completion (30%)</strong> — repetitions completed vs. prescribed.</li>
          <li><strong className="text-slate-200 print:text-black">Speed (15%)</strong> — how close each rep&apos;s duration was to the physician&apos;s demonstrated tempo.</li>
          <li><strong className="text-slate-200 print:text-black">Smoothness (15%)</strong> — how much jerk/tremor the movement had, vs. the physician&apos;s baseline.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Exercise Calibration Targets</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 print:text-slate-600 border-b border-white/10 print:border-slate-300">
                <th className="py-2 pr-4">Exercise</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Prescribed reps</th>
                <th className="py-2 pr-4">Target ROM range</th>
                <th className="py-2 pr-4">Target tempo</th>
                <th className="py-2 pr-4">Smoothness baseline</th>
              </tr>
            </thead>
            <tbody>
              {patient.assignments.map((a) => (
                <tr key={a.id} className="border-b border-white/5 print:border-slate-200">
                  <td className="py-2 pr-4">{a.exercise.name}</td>
                  <td className="py-2 pr-4 text-slate-400 print:text-slate-600">{EXERCISE_LABELS[a.exercise.type]}</td>
                  <td className="py-2 pr-4">{a.repetitions}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {a.exercise.minValue.toFixed(3)} – {a.exercise.maxValue.toFixed(3)}
                  </td>
                  <td className="py-2 pr-4">{(a.exercise.avgRepMs / 1000).toFixed(1)}s</td>
                  <td className="py-2 pr-4 font-mono text-xs">{a.exercise.smoothness.toFixed(5)}</td>
                </tr>
              ))}
              {patient.assignments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-500">No exercises assigned yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Attempt History ({patient.attempts.length})</h2>
        {patient.attempts.length === 0 ? (
          <p className="text-slate-500 text-sm">No attempts recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...patient.attempts].reverse().map((a) => {
              const reps = parseRepDetails(a.repDetails);
              const isOpen = expanded.has(a.id);
              return (
                <div key={a.id} className="rounded-lg border border-white/10 print:border-slate-300 bg-white/5 print:bg-white p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-medium">{a.exercise?.name}</div>
                      <div className="text-xs text-slate-400 print:text-slate-600">
                        {format(new Date(a.createdAt), "MMM d, yyyy HH:mm")} · {a.repsCompleted}/{a.repsPrescribed} reps
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400 print:text-slate-600">ROM {Math.round(a.romScore)}</span>
                      <span className="text-slate-400 print:text-slate-600">Speed {Math.round(a.speedScore)}</span>
                      <span className="text-slate-400 print:text-slate-600">Smooth {Math.round(a.smoothnessScore)}</span>
                      <span className="text-slate-400 print:text-slate-600">Compl. {Math.round(a.completionScore)}</span>
                      <span className={`font-bold text-lg ${scoreColor(a.overallScore)} print:text-black`}>
                        {Math.round(a.overallScore)}
                      </span>
                      <button
                        onClick={() => toggleExpanded(a.id)}
                        className="print:hidden text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/10"
                      >
                        {isOpen ? "Hide reps" : "Per-rep detail"}
                      </button>
                    </div>
                  </div>

                  {reps.length > 0 && (
                    <div className={`${isOpen ? "" : "hidden print:block"} mt-3 overflow-x-auto`}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-white/10 print:border-slate-200">
                            <th className="py-1 pr-3">Rep</th>
                            <th className="py-1 pr-3">Min</th>
                            <th className="py-1 pr-3">Max</th>
                            <th className="py-1 pr-3">ROM achieved</th>
                            <th className="py-1 pr-3">Duration</th>
                            <th className="py-1 pr-3">Jerk</th>
                            <th className="py-1 pr-3">ROM score</th>
                            <th className="py-1 pr-3">Speed score</th>
                            <th className="py-1 pr-3">Smoothness score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reps.map((r, i) => (
                            <tr key={i} className="border-b border-white/5 print:border-slate-100">
                              <td className="py-1 pr-3">{i + 1}</td>
                              <td className="py-1 pr-3 font-mono">{r.cycle.minV.toFixed(3)}</td>
                              <td className="py-1 pr-3 font-mono">{r.cycle.maxV.toFixed(3)}</td>
                              <td className="py-1 pr-3 font-mono">{(r.cycle.maxV - r.cycle.minV).toFixed(3)}</td>
                              <td className="py-1 pr-3">{(r.cycle.durationMs / 1000).toFixed(2)}s</td>
                              <td className="py-1 pr-3 font-mono">{r.cycle.jerk.toFixed(5)}</td>
                              <td className="py-1 pr-3">{Math.round(r.romScore)}</td>
                              <td className="py-1 pr-3">{Math.round(r.speedScore)}</td>
                              <td className="py-1 pr-3">{Math.round(r.smoothnessScore)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
