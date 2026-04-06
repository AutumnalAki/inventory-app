import { notFound } from "next/navigation";
import ClientPortalAdaptiveRequisition from "@/components/requisition/ClientPortalAdaptiveRequisition";

type Params = {
  name?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

type ClientPortalPageProps = {
  params?: Promise<Params> | Params;
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

export default async function ClientPortalPage({ params, searchParams }: ClientPortalPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const providedName = String(resolvedParams?.name || "");
  const providedSlug = toSlug(decodeURIComponent(providedName));
  const forceGeneric = normalizeParam(resolvedSearchParams?.view) === "generic";

  const expectedName = process.env.CLIENT_PORTAL_ACCESS_NAME;
  const expectedToken = process.env.CLIENT_PORTAL_QR_TOKEN;

  const expectedNameSlug = toSlug(expectedName || "");
  const expectedTokenSlug = toSlug(expectedToken || "");

  // Fallback keeps portal reachable even when production env vars are missing.
  const allowedSlugs = new Set(
    [expectedNameSlug, expectedTokenSlug, "client"].filter(Boolean)
  );

  if (!allowedSlugs.has(providedSlug)) {
    notFound();
  }

  return (
    <ClientPortalAdaptiveRequisition forceGeneric={forceGeneric} />
  );
}
