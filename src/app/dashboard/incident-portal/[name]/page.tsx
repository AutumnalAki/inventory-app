import { notFound, redirect } from "next/navigation";

type Params = {
  name?: string;
};

type IncidentPortalByNamePageProps = {
  params?: Promise<Params> | Params;
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function IncidentPortalByNamePage({ params }: IncidentPortalByNamePageProps) {
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

  redirect(`/incident-portal/${encodeURIComponent(providedName)}`);
}
