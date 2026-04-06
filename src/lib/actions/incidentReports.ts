"use server";

export {
  createIncidentReportWithInventorySync,
  deleteIncidentReportWithInventorySync,
  getIncidentReportById,
  getIncidentReports,
  getReportsDashboardData,
  updateIncidentReportStatus,
  updateIncidentReportWithInventorySync,
} from "@/lib/actions/inventory";

export type {
  DamagedItemInput,
  IncidentReportCreateInput,
  IncidentReportListItem,
  IncidentReportUpdateInput,
  IncidentStatus,
  ReportActionResult,
  ReportsDashboardData,
  ReportSortOption,
  ReportStatusFilter,
} from "@/lib/actions/inventory";
