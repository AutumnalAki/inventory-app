import { notFound, redirect } from "next/navigation";

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

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function ClientPortalPage({ searchParams }: ClientPortalPageProps) {
  const resolvedParams = await searchParams;
  const accessToken = normalizeParam(resolvedParams?.access);

  // Use a server-side token so only QR URLs with the correct query parameter can access this page.
  const expectedToken = process.env.CLIENT_PORTAL_QR_TOKEN;
  const expectedName = process.env.CLIENT_PORTAL_ACCESS_NAME;

  const tokenRequired = Boolean(expectedToken);
  if (tokenRequired && (!accessToken || accessToken !== expectedToken)) {
    notFound();
  }

  const destinationName = toSlug(expectedName || expectedToken || "client");
  if (!destinationName) {
    notFound();
  }

  redirect(`/client-portal/${destinationName}`);
}
