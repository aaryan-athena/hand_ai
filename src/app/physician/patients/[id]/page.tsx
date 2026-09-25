"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import PatientDetail from "./PatientDetail";

const STORAGE_KEY = "handrehab_physician_id";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [physicianId, setPhysicianId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Reads a browser-only value on mount to bridge it into React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhysicianId(localStorage.getItem(STORAGE_KEY));
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <NavBar crumbs={[{ label: "Physician", href: "/physician" }, { label: "Patient" }]} />
      <main className="flex-1 p-6">
        {physicianId === undefined ? (
          <p className="text-slate-400">Loading…</p>
        ) : physicianId === null ? (
          <p className="text-slate-400">
            Please <Link href="/physician" className="text-cyan-400">select your physician profile</Link> first.
          </p>
        ) : (
          <PatientDetail patientId={id} physicianId={physicianId} />
        )}
      </main>
    </div>
  );
}
