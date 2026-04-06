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
import {
  AlertTriangle,
  ClipboardPlus,
  FileText,
  Lock,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import IncidentReportDialog from "@/components/incident/IncidentReportDialog";
import { useRole } from "@/context/RoleContext";
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
type PrintMode = "form" | "ticket" | "both";

const STATUS_EDITOR_ROLES = new Set([
  "developer",
  "superadmin",
  "administrator",
  "program chair",
  "personnel",
  "lab personnel",
  "laboratory personnel",
  "laboratory assistant",
  "technician",
  "laboratory head",
]);

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

const toText = (value?: string | null, fallback = "N/A"): string => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const formatPrintDateTime = (value?: string | null): string => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatPrintDate = (value?: string | null): string => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toTicketCode = (report: IncidentReportListItem): string => {
  const normalizedId = String(report.id || "").trim().toUpperCase();
  if (/^IR-\d{4}-\d{5}$/.test(normalizedId)) {
    return normalizedId;
  }

  const date = new Date(report.incident_datetime || report.created_at || Date.now());
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const hash = Array.from(String(report.id || "0")).reduce(
    (acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000,
    0,
  );

  return `IR-${year}-${String(Math.abs(hash)).padStart(5, "0")}`;
};

const drawWrapped = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines: number,
  lineHeight: number,
): number => {
  const lines = doc.splitTextToSize(text || "N/A", maxWidth) as string[];
  const visible = lines.slice(0, Math.max(1, maxLines));
  doc.text(visible, x, y);
  return y + visible.length * lineHeight;
};

const drawHalfInfoCell = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
): void => {
  const labelWidth = 40;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(x + labelWidth, y, x + labelWidth, y + height);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text(`${label}:`, x + 1.5, y + 3.7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  const lines = doc.splitTextToSize(value || "N/A", width - labelWidth - 2.5) as string[];
  const maxLines = height > 10 ? 2 : 1;
  doc.text(lines.slice(0, maxLines), x + labelWidth + 1.2, y + 3.7);
};

const drawIncidentFormSection = (
  doc: jsPDF,
  report: IncidentReportListItem,
  startY = 10,
): number => {
  const x = 12;
  const width = 186;
  const headerHeight = 20;
  const infoHeights = [8, 8, 8, 14] as const;
  const infoHeight = infoHeights.reduce((sum, h) => sum + h, 0);
  const descriptionHeight = 56;
  const detailsHeight = 38;
  const signHeight = 30;
  const formHeight = headerHeight + infoHeight + descriptionHeight + detailsHeight + signHeight;

  const headerBottom = startY + headerHeight;
  const infoBottom = headerBottom + infoHeight;
  const descriptionBottom = infoBottom + descriptionHeight;
  const detailsBottom = descriptionBottom + detailsHeight;

  const halfWidth = width / 2;
  const docCodeWidth = 58;

  const incidentDate = formatPrintDateTime(report.incident_datetime || report.created_at);
  const incidentDateOnly = formatPrintDate(report.incident_datetime || report.created_at);
  const witness = toText(report.witness_name);
  const description = toText(report.incident_description);
  const injuryDetails = toText(report.injury_details);
  const injuryYesNo = injuryDetails === "N/A" ? "No" : "Yes";
  const damagedLines =
    report.damaged_items && report.damaged_items.length > 0
      ? report.damaged_items.map((item) => {
          const name = item.item_name || item.inventory_item_id;
          const notes = toText(item.damage_notes, "No additional notes");
          return `${name} - Qty ${item.damage_count}, ${notes}`;
        })
      : ["None listed"];

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(x, startY, width, formHeight);

  doc.line(x, headerBottom, x + width, headerBottom);
  doc.line(x, infoBottom, x + width, infoBottom);
  doc.line(x, descriptionBottom, x + width, descriptionBottom);
  doc.line(x, detailsBottom, x + width, detailsBottom);

  const docCodeX = x + width - docCodeWidth;
  doc.line(docCodeX, startY, docCodeX, headerBottom);

  doc.circle(x + 10, startY + 10, 5.7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("CDM", x + 10, startY + 10.8, { align: "center" });

  doc.setFontSize(8.7);
  doc.text("COLEGIO DE MUNTINLUPA", x + 18, startY + 6.7);
  doc.setFontSize(8.9);
  doc.text("INCIDENT REPORT FORM", x + 18, startY + 11.7);
  doc.setFontSize(6.4);
  doc.text("LABORATORY", x + 18, startY + 16);

  doc.rect(docCodeX, startY, docCodeWidth, headerHeight);
  doc.line(docCodeX, startY + 6, docCodeX + docCodeWidth, startY + 6);
  doc.line(docCodeX, startY + 11.8, docCodeX + docCodeWidth, startY + 11.8);
  doc.line(docCodeX + docCodeWidth / 3, startY + 6, docCodeX + docCodeWidth / 3, startY + 20);
  doc.line(docCodeX + (docCodeWidth * 2) / 3, startY + 6, docCodeX + (docCodeWidth * 2) / 3, startY + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("Document Code", docCodeX + 2, startY + 4.2);
  doc.text("Effective\nDate", docCodeX + 2, startY + 8.8);
  doc.text("Revision\nNo.", docCodeX + docCodeWidth / 3 + 2, startY + 8.8);
  doc.text("Revision\nDate", docCodeX + (docCodeWidth * 2) / 3 + 2, startY + 8.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("", docCodeX + 4, startY + 17.8);
  doc.text("", docCodeX + docCodeWidth / 3 + 4, startY + 17.8);
  doc.text("", docCodeX + (docCodeWidth * 2) / 3 + 4, startY + 17.8);

  let rowY = headerBottom;
  doc.line(x + halfWidth, headerBottom, x + halfWidth, infoBottom);

  const leftRows: Array<[string, string]> = [
    ["Name", toText(report.student_name)],
    ["Student No/Employee No.", toText(report.student_number)],
    ["Course and Course Code", toText(report.course_code)],
    ["Instructor", toText(report.instructor_name)],
  ];
  const rightRows: Array<[string, string]> = [
    ["Designation", toText(report.designation, "Student")],
    ["Date and Time", incidentDate],
    ["Location", toText(report.location)],
    ["Contact Details", toText(report.contact_number)],
  ];

  infoHeights.forEach((height, index) => {
    if (index > 0) {
      doc.line(x, rowY, x + width, rowY);
    }

    drawHalfInfoCell(doc, x, rowY, halfWidth, height, leftRows[index][0], leftRows[index][1]);
    drawHalfInfoCell(
      doc,
      x + halfWidth,
      rowY,
      halfWidth,
      height,
      rightRows[index][0],
      rightRows[index][1],
    );

    rowY += height;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Witness(es):", x + 1.5, headerBottom + infoHeight - 3.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text(witness, x + 22, headerBottom + infoHeight - 3.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.text("Description of Incident:", x + 1.5, infoBottom + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  let descY = drawWrapped(doc, description, x + 1.8, infoBottom + 8.2, width - 4.5, 5, 3.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  descY += 2;
  doc.text("Damaged Items/Equipment:", x + 1.5, descY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  drawWrapped(doc, damagedLines.join("\n"), x + 1.8, descY + 3, width - 4.5, 7, 3);

  const injuryBlockY = descriptionBottom;
  const injuryRowHeight = 15;
  doc.line(x, injuryBlockY + injuryRowHeight, x + width, injuryBlockY + injuryRowHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Did the incident result in an injury? (Yes/No)", x + 1.5, injuryBlockY + 4.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text(injuryYesNo, x + 1.5, injuryBlockY + 8.1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Description of Injury:", x + 1.5, injuryBlockY + 11.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  drawWrapped(doc, injuryDetails, x + 1.5, injuryBlockY + 14.6, width - 4, 2, 3);

  const emergencyY = injuryBlockY + injuryRowHeight;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Was an emergency personnel notified? (Yes/No)", x + 1.5, emergencyY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text("No", x + 1.5, emergencyY + 8.3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Name of personnel:", x + 1.5, emergencyY + 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text("N/A", x + 30.5, emergencyY + 11.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Date and Time:", x + 1.5, emergencyY + 14.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text(incidentDate, x + 18.5, emergencyY + 14.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Emergency Response Information:", x + 1.5, emergencyY + 18.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text("N/A", x + 1.5, emergencyY + 21.5);

  const signY = detailsBottom;
  const sigCol = width / 3;
  const sigTitles = ["Incident Reported by:", "Witnessed by:", "Noted by:"];
  const sigNames = [
    toText(report.student_name, "Personnel 1"),
    toText(report.witness_name, ""),
    toText(report.instructor_name, "Laboratory Head/Program Chair"),
  ];
  const sigSubtitles = ["", "", "Laboratory Head/Program Chair"];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  sigTitles.forEach((title, index) => {
    doc.text(title, x + sigCol * index + 1.5, signY + 4.6);
  });

  sigNames.forEach((name, index) => {
    const colX = x + sigCol * index;
    doc.setLineWidth(0.2);
    doc.line(colX + 1.5, signY + 17.5, colX + sigCol - 1.5, signY + 17.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text(name || "", colX + 1.5, signY + 20.8);

    if (sigSubtitles[index]) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.1);
      doc.text(sigSubtitles[index], colX + 1.5, signY + 23.8);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(`Date: ${incidentDateOnly}`, colX + 1.5, signY + 27.8);
  });

  return startY + formHeight;
};

const drawTicketSection = (
  doc: jsPDF,
  report: IncidentReportListItem,
  startY: number,
): number => {
  const x = 24;
  const width = 162;
  const height = 58;
  const code = toTicketCode(report);
  const incidentDate = formatPrintDateTime(report.incident_datetime || report.created_at);
  const incidentDateOnly = formatPrintDate(report.incident_datetime || report.created_at);
  const itemCount = String((report.damaged_items || []).reduce((sum, item) => sum + item.damage_count, 0));
  const approvedDate =
    report.status === "Resolved"
      ? formatPrintDateTime(report.updated_at || report.incident_datetime || report.created_at)
      : "Pending";
  const safeSingleLine = (value: string, maxWidth: number): string => {
    const lines = doc.splitTextToSize(value || "N/A", maxWidth) as string[];
    return lines[0] || "N/A";
  };
  const safeTwoLines = (value: string, maxWidth: number): string[] => {
    const lines = doc.splitTextToSize(value || "N/A", maxWidth) as string[];
    return lines.slice(0, 2);
  };

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(x, startY, width, height);

  doc.setFillColor(245, 245, 245);
  doc.rect(x, startY, width, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.text("INCIDENT REPORT TICKET", x + width / 2, startY + 4.7, { align: "center" });
  doc.setFontSize(9.8);
  doc.text(code, x + width / 2, startY + 9.8, { align: "center" });

  doc.line(x + 4, startY + 12, x + width - 4, startY + 12);
  doc.line(x + width / 2, startY + 12, x + width / 2, startY + 24);
  doc.line(x + 4, startY + 18, x + width - 4, startY + 18);
  doc.line(x + 4, startY + 24, x + width - 4, startY + 24);
  doc.line(x + 4, startY + 32, x + width - 4, startY + 32);
  const metricsTopY = startY + 42;
  const metricsBottomY = startY + 50;
  const footerTopY = startY + 53;
  const footerTextY = startY + 56;

  doc.line(x + 4, metricsTopY, x + width - 4, metricsTopY);
  doc.line(x + width / 2, metricsTopY, x + width / 2, metricsBottomY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.text("STUDENT NAME", x + 6, startY + 15.3);
  doc.text("DATE & TIME", x + width / 2 + 2, startY + 15.3);

  doc.setFontSize(5.7);
  doc.text(safeSingleLine(toText(report.student_name), width / 2 - 8), x + 6, startY + 21.1);
  doc.text(safeSingleLine(incidentDate, width / 2 - 8), x + width / 2 + 2, startY + 21.1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.text("LOCATION", x + 6, startY + 27.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.7);
  doc.text(safeSingleLine(toText(report.location), width - 14), x + 6, startY + 30.9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.text("INCIDENT", x + 6, startY + 35.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  const incidentSingle = toText(report.incident_description).replace(/\s+/g, " ");
  const incidentLines = safeTwoLines(incidentSingle, width - 14);
  doc.text(incidentLines, x + 6, startY + 39.1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("ITEMS", x + 6, startY + 45.9);
  doc.setTextColor(186, 0, 0);
  doc.setFontSize(7.5);
  doc.text(itemCount, x + 6, startY + 49.6);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("APPROVED", x + width / 2 + 2, startY + 45.9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(safeSingleLine(approvedDate, width / 2 - 8), x + width / 2 + 2, startY + 49.6);

  doc.setLineDashPattern([1, 1], 0);
  doc.line(x + 4, footerTopY, x + width - 4, footerTopY);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.6);
  doc.text(`Keep this ticket for records - ${incidentDateOnly}`, x + width / 2, footerTextY, {
    align: "center",
  });

  return startY + height;
};

const printReport = (report: IncidentReportListItem, mode: PrintMode): void => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (mode === "form") {
    drawIncidentFormSection(doc, report, 10);
  } else if (mode === "ticket") {
    drawTicketSection(doc, report, 26);
  } else {
    drawIncidentFormSection(doc, report, 10);
    doc.setLineWidth(0.2);
    doc.setDrawColor(95, 95, 95);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(12, 230, 198, 230);
    doc.setLineDashPattern([], 0);
    drawTicketSection(doc, report, 234);
  }

  const suffix = mode === "form" ? "Form" : mode === "ticket" ? "Ticket" : "Report-And-Ticket";
  doc.save(`Incident-Report-${suffix}-${report.id}.pdf`);
};

export default function ReportsPageClient({ embedded = false }: ReportsPageClientProps) {
  const roleContext = useRole();
  const role = roleContext?.role;
  const previewRole = roleContext?.previewRole;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ReportsDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("broken");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<ReportSortOption>("most_recent");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<IncidentReportListItem | null>(null);
  const [printTarget, setPrintTarget] = useState<IncidentReportListItem | null>(null);
  const [printing, setPrinting] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseReports = dashboardData?.incident_reports || [];
  const effectiveRole = String(previewRole || role || "Student").trim().toLowerCase();
  const canEditStatus = STATUS_EDITOR_ROLES.has(effectiveRole);

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

    const query = searchTerm.trim().toLowerCase();
    const bySearch = !query
      ? byStatus
      : byStatus.filter((item) => {
          const itemsText = (item.damaged_items || [])
            .map((damaged) => `${damaged.item_name || ""} ${damaged.inventory_item_id}`)
            .join(" ")
            .toLowerCase();

          const searchable = [
            item.student_name || "",
            item.student_number || "",
            item.location || "",
            item.incident_description || "",
            itemsText,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(query);
        });

    const sorted = [...bySearch].sort((a, b) => {
      const aMs = parseDateMs(a.incident_datetime || a.created_at);
      const bMs = parseDateMs(b.incident_datetime || b.created_at);
      return sortBy === "oldest" ? aMs - bMs : bMs - aMs;
    });

    return sorted;
  }, [optimisticReports, searchTerm, sortBy, statusFilter]);

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
    if (!canEditStatus) {
      setError("Only authorized Personnel/Admin users can update incident status.");
      return;
    }

    mutateReports({ type: "status", id: reportId, status });

    startTransition(async () => {
      setActiveRowId(reportId);
      const result = await updateIncidentReportStatus(reportId, status, effectiveRole);
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

  const handlePrint = async (mode: PrintMode) => {
    if (!printTarget || printing) return;

    setPrinting(true);
    try {
      printReport(printTarget, mode);
      setPrintTarget(null);
    } finally {
      setPrinting(false);
    }
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
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Search
              </span>
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by reported by, student no, location, subject or item"
                  className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500"
                />
              </div>
            </label>

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

      {activeTab === "reports" && !canEditStatus ? (
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <Lock size={13} />
          Status updates are restricted to authorized Personnel/Admin users.
        </div>
      ) : null}

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
                  <th className="px-4 py-3">Subject / Item</th>
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
                        <p className="text-gray-300">{report.incident_description || "-"}</p>
                        <p className="mt-1 text-gray-500">
                          {(report.damaged_items || [])
                            .map((item) => item.item_name || item.inventory_item_id)
                            .slice(0, 2)
                            .join(", ") || "No item listed"}
                          {(report.damaged_items || []).length > 2
                            ? ` +${(report.damaged_items || []).length - 2} more`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={report.status}
                          onChange={(event) => {
                            if (!canEditStatus) return;
                            handleInlineStatusChange(
                              report.id,
                              event.target.value as IncidentStatus,
                            );
                          }}
                          disabled={busy || !canEditStatus}
                          title={
                            canEditStatus
                              ? ""
                              : "Only authorized Personnel/Admin users can edit status"
                          }
                          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                            onClick={() => setPrintTarget(report)}
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

      {printTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#080808] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/35 bg-blue-500/20 text-blue-200">
              <Printer size={20} />
            </div>

            <h3 className="text-center text-2xl font-bold text-white">Select Print Option</h3>
            <p className="mt-1 text-center text-sm text-gray-400">
              Choose what to print for this incident report.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void handlePrint("form")}
                disabled={printing}
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText size={15} />
                Print Full Incident Report
              </button>

              <button
                type="button"
                onClick={() => void handlePrint("ticket")}
                disabled={printing}
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Ticket size={15} />
                Print Incident Ticket Only
              </button>

              <button
                type="button"
                onClick={() => void handlePrint("both")}
                disabled={printing}
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer size={15} />
                Print Both (Report + Ticket)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!printing) setPrintTarget(null);
                }}
                disabled={printing}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
