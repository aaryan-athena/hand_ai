import { use } from "react";
import NavBar from "@/components/NavBar";
import ReportView from "@/components/ReportView";

export default function PhysicianPatientReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex flex-col flex-1">
      <div className="print:hidden">
        <NavBar
          crumbs={[
            { label: "Physician", href: "/physician" },
            { label: "Patient", href: `/physician/patients/${id}` },
            { label: "Report" },
          ]}
        />
      </div>
      <main className="flex-1 p-6">
        <ReportView patientId={id} audience="physician" />
      </main>
    </div>
  );
}
