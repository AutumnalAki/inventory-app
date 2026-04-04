import { notFound, redirect } from "next/navigation";

type Params = {
  name?: string;
};

type ClientPortalByNamePageProps = {
  params?: Promise<Params> | Params;
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function ClientPortalByNamePage({ params }: ClientPortalByNamePageProps) {
  const resolvedParams = await params;
  const providedName = String(resolvedParams?.name || "");
  const providedSlug = toSlug(decodeURIComponent(providedName));

  // Supports a human-friendly name key while keeping backward compatibility
  // with the old token value if needed.
  const expectedName = process.env.CLIENT_PORTAL_ACCESS_NAME;
  const expectedToken = process.env.CLIENT_PORTAL_QR_TOKEN;

  const expectedNameSlug = toSlug(expectedName || "");
  const expectedTokenSlug = toSlug(expectedToken || "");

  const allowedSlugs = new Set(
    [expectedNameSlug, expectedTokenSlug, "client"].filter(Boolean)
  );

  if (!allowedSlugs.has(providedSlug)) {
    notFound();
  }

  redirect(`/client-portal/${encodeURIComponent(providedName)}`);
}
