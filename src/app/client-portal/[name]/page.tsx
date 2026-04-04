import { notFound } from "next/navigation";
import RequisitionFormTestingPage from "../../dashboard/requisition-form-testing/page";

type Params = {
  name?: string;
};

type ClientPortalPageProps = {
  params?: Promise<Params> | Params;
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function ClientPortalPage({ params }: ClientPortalPageProps) {
  const resolvedParams = await params;
  const providedName = String(resolvedParams?.name || "");
  const providedSlug = toSlug(decodeURIComponent(providedName));

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
    <RequisitionFormTestingPage
      hideToolbar
      postSubmitAction="reset"
      hideDownloadCopyButton
    />
  );
}
