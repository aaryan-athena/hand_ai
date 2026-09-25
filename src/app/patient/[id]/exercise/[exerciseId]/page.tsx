import { use } from "react";
import NavBar from "@/components/NavBar";
import ExercisePerformer from "./ExercisePerformer";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ id: string; exerciseId: string }>;
}) {
  const { id, exerciseId } = use(params);
  return (
    <div className="flex flex-col flex-1">
      <NavBar
        crumbs={[
          { label: "Patient", href: "/patient" },
          { label: "My Exercises", href: `/patient/${id}` },
          { label: "Exercise" },
        ]}
      />
      <main className="flex-1 p-6">
        <ExercisePerformer patientId={id} exerciseId={exerciseId} />
      </main>
    </div>
  );
}
