import { notFound } from "next/navigation";
import RequisitionFormTestingPage from "../requisition-form-testing/page";

type SearchParams = Record<string, string | string[] | undefined>;
type ClientPortalPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function normalizeParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] || "";
  }
  return param || "";
}

export default async function ClientPortalPage({ searchParams }: ClientPortalPageProps) {
  const resolvedParams = await searchParams;
  const accessToken = normalizeParam(resolvedParams?.access);

  // Use a server-side token so only QR URLs with the correct query parameter can access this page.
  const expectedToken = process.env.CLIENT_PORTAL_QR_TOKEN;

  if (!expectedToken || !accessToken || accessToken !== expectedToken) {
    notFound();
  }

  return <RequisitionFormTestingPage />;
}
