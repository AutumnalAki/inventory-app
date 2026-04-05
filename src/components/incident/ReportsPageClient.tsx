"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  ClipboardPlus,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import IncidentReportDialog from "@/components/incident/IncidentReportDialog";
import {
  deleteIncidentReportWithInventorySync,
  getReportsDashboardData,
  updateIncidentReportStatus,
  type BrokenItemListRow,
  type IncidentReportListItem,
  type IncidentStatus,
  type ReportsDashboardData,
  type ReportSortOption,
  type ReportStatusFilter,
} from "@/lib/actions/inventory";

type ReportsPageClientProps = {
  embedded?: boolean;
};

type OptimisticAction =
  | { type: "replace"; report: IncidentReportListItem }
  | { type: "delete"; id: string }
  | { type: "status"; id: string; status: IncidentStatus };

type TabId = "broken" | "reports";

const REPORT_STATUS_OPTIONS: IncidentStatus[] = ["Pending", "In Review", "Resolved"];

const parseDateMs = (value?: string | null): number => {
  if (!value) return 0;
  const date = new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const printReport = (report: IncidentReportListItem): void => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Incident Report", 14, 18);

  doc.setFontSize(10);
  const summaryRows = [
    ["Report ID", report.id],
    ["Status", report.status],
    ["Student Name", report.student_name || "-"],
    ["Student Number", report.student_number || "-"],
    ["Course Code", report.course_code || "-"],
    ["Designation", report.designation || "-"],
    ["Contact", report.contact_number || "-"],
    ["Incident Date/Time", formatDate(report.incident_datetime)],
    ["Location", report.location || "-"],
    ["Witness", report.witness_name || "-"],
    ["Instructor", report.instructor_name || "-"],
  ];

  autoTable(doc, {
    startY: 24,
    head: [["Field", "Value"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
  });

  let cursorY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 88;
  cursorY += 8;

  doc.setFontSize(11);
  doc.text("Incident Description", 14, cursorY);
  cursorY += 4;

  const description = report.incident_description || "-";
  const descriptionLines = doc.splitTextToSize(description, 180);
  doc.setFontSize(9);
  doc.text(descriptionLines, 14, cursorY + 3);

  cursorY += Math.max(descriptionLines.length * 4 + 8, 14);

  doc.setFontSize(11);
  doc.text("Injury Details", 14, cursorY);
  cursorY += 4;

  const injury = report.injury_details || "-";
  const injuryLines = doc.splitTextToSize(injury, 180);
  doc.setFontSize(9);
  doc.text(injuryLines, 14, cursorY + 3);

  cursorY += Math.max(injuryLines.length * 4 + 8, 14);

  const damagedRows = (report.damaged_items || []).map((item) => [
    item.item_name || item.inventory_item_id,
    String(item.damage_count),
    item.damage_notes || "-",
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [["Damaged Item", "Quantity", "Notes"]],
    body: damagedRows.length > 0 ? damagedRows : [["-", "0", "-"]],
    theme: "grid",
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 9 },
  });

  doc.save(`Incident-Report-${report.id}.pdf`);
};

export default function ReportsPageClient({ embedded = false }: ReportsPageClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ReportsDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("broken");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("All");
  const [sortBy, setSortBy] = useState<ReportSortOption>("most_recent");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<IncidentReportListItem | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseReports = dashboardData?.incident_reports || [];

  const [optimisticReports, mutateReports] = useOptimistic<
    IncidentReportListItem[],
    OptimisticAction
  >(baseReports, (state, action) => {
    if (action.type === "replace") {
      return state.map((item) => (item.id === action.report.id ? action.report : item));
    }

    if (action.type === "delete") {
      return state.filter((item) => item.id !== action.id);
    }

    if (action.type === "status") {
      return state.map((item) =>
        item.id === action.id ? { ...item, status: action.status } : item,
      );
    }

    return state;
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getReportsDashboardData();
    if (result.error || !result.data) {
      setDashboardData(null);
      setError(result.error || "Failed to load report dashboard data.");
      setLoading(false);
      return;
    }

    setDashboardData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleReports = useMemo(() => {
    const byStatus =
      statusFilter === "All"
        ? optimisticReports
        : optimisticReports.filter((item) => item.status === statusFilter);

    const sorted = [...byStatus].sort((a, b) => {
      const aMs = parseDateMs(a.incident_datetime || a.created_at);
      const bMs = parseDateMs(b.incident_datetime || b.created_at);
      return sortBy === "oldest" ? aMs - bMs : bMs - aMs;
    });

    return sorted;
  }, [optimisticReports, sortBy, statusFilter]);

  const visibleBrokenItems = useMemo(() => {
    const source = dashboardData?.broken_items || [];

    const reportById = new Map(optimisticReports.map((report) => [report.id, report]));

    return source
      .filter((item) => reportById.has(item.incident_report_id))
      .map((item) => {
        const report = reportById.get(item.incident_report_id);
        return {
          ...item,
          report_status: report?.status || item.report_status,
        } satisfies BrokenItemListRow;
      });
  }, [dashboardData?.broken_items, optimisticReports]);

  const stats = dashboardData?.stats || {
    total_items: 0,
    available_items: 0,
    in_use_items: 0,
    broken_items: 0,
  };

  const handleInlineStatusChange = (reportId: string, status: IncidentStatus) => {
    mutateReports({ type: "status", id: reportId, status });

    startTransition(async () => {
      setActiveRowId(reportId);
      const result = await updateIncidentReportStatus(reportId, status);
      if (result.error) {
        setError(result.error);
      }
      await refresh();
      setActiveRowId(null);
    });
  };

  const handleDelete = (reportId: string) => {
    const confirmed = window.confirm("Delete this incident report permanently?");
    if (!confirmed) return;

    mutateReports({ type: "delete", id: reportId });

    startTransition(async () => {
      setActiveRowId(reportId);
      const result = await deleteIncidentReportWithInventorySync(reportId);
      if (result.error) {
        setError(result.error);
      }
      await refresh();
      setActiveRowId(null);
    });
  };

  const cardClass =
    "rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm";

  return (
    <div
      className={
        embedded
          ? "space-y-4 md:space-y-6"
          : "min-h-screen bg-[#050505] p-4 text-white md:p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Incident Reports</h1>
          <p className="mt-1 text-sm text-gray-400">
            Live incident reporting and inventory sync dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
            disabled={isPending}
          >
            <ClipboardPlus size={14} />
            Add Incident Report
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10"
            disabled={loading || isPending}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <div className={cardClass}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Items</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.total_items}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Available</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.available_items}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">In Use</p>
          <p className="mt-1 text-2xl font-bold text-blue-300">{stats.in_use_items}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Broken</p>
          <p className="mt-1 text-2xl font-bold text-red-300">{stats.broken_items}</p>
        </div>
      </div>

      <Sidebar title="Reports View">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("broken")}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "broken"
                ? "border-red-500/50 bg-red-500/20 text-red-100"
                : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/10"
            }`}
          >
            Damaged / Broken Items
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "reports"
                ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-100"
                : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/10"
            }`}
          >
            Incident Reports
          </button>
        </div>

        {activeTab === "reports" ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ReportStatusFilter)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-indigo-500"
              >
                <option value="All" className="bg-black">
                  All
                </option>
                <option value="Pending" className="bg-black">
                  Pending
                </option>
                <option value="In Review" className="bg-black">
                  In Review
                </option>
                <option value="Resolved" className="bg-black">
                  Resolved
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Date
              </span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as ReportSortOption)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-indigo-500"
              >
                <option value="most_recent" className="bg-black">
                  Most Recent
                </option>
                <option value="oldest" className="bg-black">
                  Oldest
                </option>
              </select>
            </label>
          </div>
        ) : null}
      </Sidebar>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
          <div className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading reports dashboard...
          </div>
        </div>
      ) : null}

      {!loading && activeTab === "broken" ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 border-b border-white/10 bg-red-500/10 px-4 py-3">
            <AlertTriangle size={16} className="text-red-300" />
            <p className="text-sm font-bold text-white">Damaged / Broken Items</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty Damaged</th>
                  <th className="px-4 py-3">Report ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {visibleBrokenItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{item.item_name}</td>
                    <td className="px-4 py-3 text-red-300">{item.damage_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{item.incident_report_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{item.report_status}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{item.damage_notes || "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(item.incident_datetime || item.created_at)}
                    </td>
                  </tr>
                ))}
                {visibleBrokenItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No damaged items found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && activeTab === "reports" ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 border-b border-white/10 bg-indigo-500/10 px-4 py-3">
            <FileText size={16} className="text-indigo-300" />
            <p className="text-sm font-bold text-white">Incident Reports</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Damaged Items</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {visibleReports.map((report) => {
                  const busy = activeRowId === report.id && isPending;

                  return (
                    <tr key={report.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {formatDate(report.incident_datetime || report.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{report.student_name || "-"}</p>
                        <p className="text-xs text-gray-500">{report.student_number || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{report.location || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {(report.damaged_items || []).length}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={report.status}
                          onChange={(event) =>
                            handleInlineStatusChange(
                              report.id,
                              event.target.value as IncidentStatus,
                            )
                          }
                          disabled={busy}
                          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                        >
                          {REPORT_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option} className="bg-black">
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingReport(report)}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/20 px-2 py-1 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/30"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => printReport(report)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold text-gray-200 hover:bg-white/10"
                          >
                            <FileText size={12} />
                            Print
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No incident reports found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <IncidentReportDialog
        open={isCreateOpen}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          startTransition(async () => {
            await refresh();
          });
        }}
      />

      <IncidentReportDialog
        open={Boolean(editingReport)}
        mode="edit"
        initialReport={editingReport}
        onClose={() => setEditingReport(null)}
        onSuccess={(report) => {
          mutateReports({ type: "replace", report });
          setEditingReport(null);
          startTransition(async () => {
            await refresh();
          });
        }}
      />
    </div>
  );
}
