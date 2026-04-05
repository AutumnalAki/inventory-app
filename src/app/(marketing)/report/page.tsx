import StudentIncidentReportForm from "@/components/incident/StudentIncidentReportForm";

const STUDENT_REPORT_OWNER_USER_ID =
  process.env.STUDENT_REPORT_OWNER_USER_ID ||
  process.env.NEXT_PUBLIC_STUDENT_REPORT_OWNER_USER_ID ||
  null;

export default function PublicIncidentReportPage() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6 md:py-10">
      <StudentIncidentReportForm reportOwnerUserId={STUDENT_REPORT_OWNER_USER_ID} />
    </div>
  );
}
