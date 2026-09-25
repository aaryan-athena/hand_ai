import NavBar from "@/components/NavBar";
import PatientSelector from "./PatientSelector";

export default function PatientHomePage() {
  return (
    <div className="flex flex-col flex-1">
      <NavBar crumbs={[{ label: "Patient" }]} />
      <main className="flex-1 p-6 flex items-center justify-center">
        <PatientSelector />
      </main>
    </div>
  );
}
