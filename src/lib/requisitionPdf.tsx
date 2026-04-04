"use client";

import React from "react";
import { pdf } from "@react-pdf/renderer";
import RequisitionTemplate, { RequisitionPdfData } from "@/components/pdf/RequisitionTemplate";

const safeName = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, "_");

export async function downloadRequisitionPdf(requisition: RequisitionPdfData, fileName?: string) {
  const blob = await pdf(<RequisitionTemplate requisition={requisition} />).toBlob();

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
