"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";
import ErrorNotice from "@/components/ErrorNotice";

const STORAGE_KEY = "handrehab_patient_id";

export default function PatientSelector() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<Patient[]>("/api/patients")
      .then(setPatients)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function selectPatient(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    router.push(`/patient/${id}`);
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error) return <ErrorNotice message={error} />;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Who&apos;s exercising today?</h1>
      <p className="text-slate-400 text-sm">
        Your physician sets up your profile. Not on the list? Ask your physician to add you.
      </p>
      <div className="flex flex-col gap-2">
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPatient(p.id)}
            className="text-left px-4 py-3 rounded-lg border border-white/10 hover:border-orange-400/50 hover:bg-white/5"
          >
            <div className="font-medium">{p.name}</div>
            {p.condition && <div className="text-xs text-slate-400">{p.condition}</div>}
          </button>
        ))}
        {patients.length === 0 && (
          <p className="text-slate-500 text-sm">No patient profiles yet — ask your physician to create one.</p>
        )}
      </div>
    </div>
  );
}
