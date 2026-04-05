"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, ClipboardPlus } from "lucide-react";
import IncidentReportDialog from "@/components/incident/IncidentReportDialog";
import type { IncidentReportListItem } from "@/lib/actions/inventory";

type StudentIncidentReportFormProps = {
  reportOwnerUserId?: string | null;
};

export default function StudentIncidentReportForm({
  reportOwnerUserId,
}: StudentIncidentReportFormProps) {
  const [open, setOpen] = useState(false);
  const [latestReport, setLatestReport] = useState<IncidentReportListItem | null>(null);

  const submittedAt = useMemo(() => {
    if (!latestReport?.created_at) return "";
    const date = new Date(latestReport.created_at);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }, [latestReport]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Digital Incident Reporting</h1>
            <p className="mt-1 text-sm text-gray-400">
              Submit lab incidents using the guided 4-step report form.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
          >
            <ClipboardPlus size={16} />
            New Incident Report
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs text-gray-400 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            Step 1: Personal information
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            Step 2: Incident details
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            Step 3-4: Description and equipment
          </div>
        </div>
      </div>

      {latestReport ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
          <div className="mb-1 inline-flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 size={16} />
            Incident report submitted successfully
          </div>
          <p className="text-xs">
            Report ID: {latestReport.id}
            {submittedAt ? ` • Submitted: ${submittedAt}` : ""}
          </p>
        </div>
      ) : null}

      <IncidentReportDialog
        open={open}
        onClose={() => setOpen(false)}
        reportOwnerUserId={reportOwnerUserId}
        onSuccess={(report) => {
          setLatestReport(report);
          setOpen(false);
        }}
      />
    </div>
  );
}
