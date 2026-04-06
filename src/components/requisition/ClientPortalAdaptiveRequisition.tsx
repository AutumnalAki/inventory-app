"use client";

import React, { useEffect, useState } from "react";
import RequisitionFormTestingPage from "@/app/dashboard/requisition-form-testing/page";
import ClientPortalGenericRequisitionForm from "@/components/requisition/ClientPortalGenericRequisitionForm";

type ClientPortalAdaptiveRequisitionProps = {
  forceGeneric?: boolean;
};

const COMPACT_FORM_QUERY = "(max-width: 1200px)";

export default function ClientPortalAdaptiveRequisition({
  forceGeneric = false,
}: ClientPortalAdaptiveRequisitionProps) {
  const [useGenericForm, setUseGenericForm] = useState(forceGeneric);

  useEffect(() => {
    if (forceGeneric) {
      setUseGenericForm(true);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(COMPACT_FORM_QUERY);

    const updateMode = () => {
      setUseGenericForm(mediaQuery.matches);
    };

    updateMode();

    mediaQuery.addEventListener("change", updateMode);
    return () => {
      mediaQuery.removeEventListener("change", updateMode);
    };
  }, [forceGeneric]);

  if (useGenericForm) {
    return (
      <ClientPortalGenericRequisitionForm
        compact
        showLivePrintablePreview
        previewDefaultOpen={false}
      />
    );
  }

  return (
    <RequisitionFormTestingPage
      hideToolbar
      postSubmitAction="reset"
      hideDownloadCopyButton
    />
  );
}
