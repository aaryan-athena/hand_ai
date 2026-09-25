import { use } from "react";
import NavBar from "@/components/NavBar";
import PatientHome from "./PatientHome";

export default function PatientHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex flex-col flex-1">
      <NavBar crumbs={[{ label: "Patient", href: "/patient" }, { label: "My Exercises" }]} />
      <main className="flex-1 p-6">
        <PatientHome patientId={id} />
      </main>
    </div>
  );
}
