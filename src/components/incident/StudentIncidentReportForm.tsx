"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardPlus, Monitor, Smartphone } from "lucide-react";
import IncidentReportDialog from "@/components/incident/IncidentReportDialog";
import type { IncidentReportListItem } from "@/lib/actions/inventory";

type StudentIncidentReportFormProps = {
  reportOwnerUserId?: string | null;
  autoOpenOnLoad?: boolean;
  showAllFields?: boolean;
};

export default function StudentIncidentReportForm({
  reportOwnerUserId,
  autoOpenOnLoad = false,
  showAllFields = false,
}: StudentIncidentReportFormProps) {
  const [open, setOpen] = useState(autoOpenOnLoad);
  const [latestReport, setLatestReport] = useState<IncidentReportListItem | null>(null);

  useEffect(() => {
    if (autoOpenOnLoad) {
      setOpen(true);
    }
  }, [autoOpenOnLoad]);

  const submittedAt = useMemo(() => {
    if (!latestReport?.created_at) return "";
    const date = new Date(latestReport.created_at);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }, [latestReport]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:block">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Digital Incident Reporting</h1>
            <p className="mt-1 text-sm text-gray-400">
              {showAllFields
                ? "Desktop mode: all incident fields are visible in one page for faster reporting."
                : "Desktop mode: submit incidents using the guided 4-step report form."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2.5 text-sm font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
          >
            <ClipboardPlus size={16} />
            {autoOpenOnLoad ? "Open Form Again" : "New Incident Report"}
          </button>
        </div>

        {showAllFields ? (
          <div className="grid grid-cols-1 gap-3 text-xs text-gray-400 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              Personal and contact information
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              Incident details and description
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              Damaged equipment and quantities
            </div>
          </div>
        ) : (
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
        )}

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-400">
          <Monitor size={14} />
          Optimized for larger screens and keyboard input.
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:hidden">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 p-2 text-indigo-100">
            <Smartphone size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white">Incident Report (Mobile)</h1>
            <p className="mt-1 text-xs text-gray-400">
              {showAllFields
                ? "Mobile mode: all required fields are shown in one scrollable form."
                : "Mobile mode: bigger touch targets and compact step guidance for phones."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-3 text-sm font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
        >
          <ClipboardPlus size={16} />
          {autoOpenOnLoad ? "Open Form Again" : "Start Incident Report"}
        </button>

        {showAllFields ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-2 text-xs text-gray-400">
            Single-page mode: fill in all fields then submit once.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">1. Personal</div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">2. Details</div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">3. Description</div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2">4. Equipment</div>
          </div>
        )}
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
        dialogClassName="max-h-[92vh]"
        modeVariant={showAllFields ? "single-page" : "stepper"}
        reportOwnerUserId={reportOwnerUserId}
        onSuccess={(report) => {
          setLatestReport(report);
          setOpen(false);
        }}
      />
    </div>
  );
}
