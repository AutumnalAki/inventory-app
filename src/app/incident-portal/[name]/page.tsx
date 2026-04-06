import { notFound } from "next/navigation";
import StudentIncidentReportForm from "@/components/incident/StudentIncidentReportForm";

const STUDENT_REPORT_OWNER_USER_ID =
  process.env.STUDENT_REPORT_OWNER_USER_ID ||
  process.env.NEXT_PUBLIC_STUDENT_REPORT_OWNER_USER_ID ||
  null;

type Params = {
  name?: string;
};

type IncidentPortalPageProps = {
  params?: Promise<Params> | Params;
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function IncidentPortalPage({ params }: IncidentPortalPageProps) {
  const resolvedParams = await params;
  const providedName = String(resolvedParams?.name || "");
  const providedSlug = toSlug(decodeURIComponent(providedName));

  const expectedName =
    process.env.INCIDENT_PORTAL_ACCESS_NAME ||
    process.env.INCIDENT_REPORT_ACCESS_NAME;
  const expectedToken =
    process.env.INCIDENT_PORTAL_QR_TOKEN ||
    process.env.INCIDENT_REPORT_QR_TOKEN;

  const expectedNameSlug = toSlug(expectedName || "");
  const expectedTokenSlug = toSlug(expectedToken || "");

  const allowedSlugs = new Set(
    [expectedNameSlug, expectedTokenSlug, "incident"].filter(Boolean),
  );

  if (!allowedSlugs.has(providedSlug)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6 md:py-10">
      <StudentIncidentReportForm
        reportOwnerUserId={STUDENT_REPORT_OWNER_USER_ID}
        autoOpenOnLoad
        showAllFields
      />
    </div>
  );
}
