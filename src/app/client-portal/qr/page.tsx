import { headers } from "next/headers";
import QRCode from "qrcode";

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPortalSlug(): string {
  const expectedName = process.env.CLIENT_PORTAL_ACCESS_NAME;
  const expectedToken = process.env.CLIENT_PORTAL_QR_TOKEN;
  return toSlug(expectedName || expectedToken || "client");
}

export default async function ClientPortalQrPage() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host") || "localhost:3000";
  const protocol = forwardedProto || (process.env.NODE_ENV === "development" ? "http" : "https");

  const slug = getPortalSlug();
  const portalUrl = `${protocol}://${host}/client-portal/${encodeURIComponent(slug)}`;

  const qrDataUrl = await QRCode.toDataURL(portalUrl, {
    width: 640,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Client Portal QR</h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">
          Scan this code to open the client requisition portal.
        </p>

        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
          <div className="bg-white rounded-xl p-4 inline-block">
            <img src={qrDataUrl} alt="Client portal QR code" className="w-64 h-64 sm:w-80 sm:h-80" />
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-gray-400">Portal Link</p>
            <a href={portalUrl} target="_blank" rel="noreferrer" className="break-all text-emerald-300 hover:text-emerald-200 text-sm">
              {portalUrl}
            </a>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={qrDataUrl}
              download={`client-portal-${slug}-qr.png`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Download QR PNG
            </a>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Open Portal
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
