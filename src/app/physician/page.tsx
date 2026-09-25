import NavBar from "@/components/NavBar";
import PhysicianDashboard from "./PhysicianDashboard";

export default function PhysicianPage() {
  return (
    <div className="flex flex-col flex-1">
      <NavBar crumbs={[{ label: "Physician" }]} />
      <main className="flex-1 p-6">
        <PhysicianDashboard />
      </main>
    </div>
  );
}
