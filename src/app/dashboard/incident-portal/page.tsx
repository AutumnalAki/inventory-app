import { notFound, redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;
type IncidentPortalPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function normalizeParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] || "";
  }
  return param || "";
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function IncidentPortalPage({ searchParams }: IncidentPortalPageProps) {
  const resolvedParams = await searchParams;
  const accessToken = normalizeParam(resolvedParams?.access);

  const expectedToken =
    process.env.INCIDENT_PORTAL_QR_TOKEN ||
    process.env.INCIDENT_REPORT_QR_TOKEN;
  const expectedName =
    process.env.INCIDENT_PORTAL_ACCESS_NAME ||
    process.env.INCIDENT_REPORT_ACCESS_NAME;

  const tokenRequired = Boolean(expectedToken);
  if (tokenRequired && (!accessToken || accessToken !== expectedToken)) {
    notFound();
  }

  const destinationName = toSlug(expectedName || expectedToken || "incident");
  if (!destinationName) {
    notFound();
  }

  redirect(`/incident-portal/${destinationName}`);
}
