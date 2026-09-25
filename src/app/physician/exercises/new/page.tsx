"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import CalibrationRecorder from "./CalibrationRecorder";

const STORAGE_KEY = "handrehab_physician_id";

export default function NewExercisePage() {
  const [physicianId, setPhysicianId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Reads a browser-only value on mount to bridge it into React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhysicianId(localStorage.getItem(STORAGE_KEY));
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <NavBar crumbs={[{ label: "Physician", href: "/physician" }, { label: "New Exercise" }]} />
      <main className="flex-1 p-6">
        {physicianId === undefined ? (
          <p className="text-slate-400">Loading…</p>
        ) : physicianId === null ? (
          <p className="text-slate-400">
            Please <Link href="/physician" className="text-cyan-400">select your physician profile</Link> first.
          </p>
        ) : (
          <CalibrationRecorder physicianId={physicianId} />
        )}
      </main>
    </div>
  );
}
