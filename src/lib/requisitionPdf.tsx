"use client";

import React from "react";
import { pdf } from "@react-pdf/renderer";
import RequisitionTemplate, { RequisitionPdfData } from "@/components/pdf/RequisitionTemplate";

const safeName = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, "_");
let cachedLogoDataUrl: string | null = null;

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const loadLogoDataUrl = async (logoPath: string) => {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;

    const logoUrl = logoPath.startsWith("http")
      ? logoPath
      : `${window.location.origin}${logoPath.startsWith("/") ? logoPath : `/${logoPath}`}`;

    const response = await fetch(logoUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load logo for PDF export.");
    }

    const blob = await response.blob();
    cachedLogoDataUrl = await blobToDataUrl(blob);
    return cachedLogoDataUrl;
};

export async function downloadRequisitionPdf(requisition: RequisitionPdfData, fileName?: string) {
  const logoSrc = requisition.logoSrc || "/favicon.ico";
  let logoDataUrl = requisition.logoDataUrl;

  if (!logoDataUrl) {
    try {
      logoDataUrl = await loadLogoDataUrl(logoSrc);
    } catch {
      logoDataUrl = undefined;
    }
  }

  const blob = await pdf(
    <RequisitionTemplate
      requisition={{
        ...requisition,
        logoSrc,
        logoDataUrl,
      }}
    />
  ).toBlob();

  const targetFile = fileName || `Requisition-${safeName(requisition.id || requisition.studentNumber || "Copy")}.pdf`;
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = targetFile;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(blobUrl);
}

export type { RequisitionPdfData };
