"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/actions/supabaseServer";

const INCIDENT_REPORTS_TABLE = "incident_reports";
const BROKEN_ITEMS_TABLE = "broken_items";
const INVENTORY_ITEMS_TABLE = "inventory_items";
const INVENTORY_TABLE_FALLBACK = "inventory";
const INCIDENT_REPORTS_TABLE_CANDIDATES = [INCIDENT_REPORTS_TABLE] as const;
const BROKEN_ITEMS_TABLE_CANDIDATES = [BROKEN_ITEMS_TABLE] as const;
const INVENTORY_TABLE_CANDIDATES = [
  INVENTORY_ITEMS_TABLE,
  INVENTORY_TABLE_FALLBACK,
] as const;
const INCIDENT_SCHEMA_SETUP_HINT =
  "Incident reporting tables are not installed. Run migration 20260405_create_incident_reporting_tables.sql.";

const REPORT_REVALIDATE_PATHS = [
  "/reports",
  "/dashboard/reports",
  "/(protected)/reports",
] as const;

const REPORT_DATE_COLUMNS = [
  "created_at",
  "incident_datetime",
  "date_time",
  "incident_date",
  "submitted_at",
] as const;

const BROKEN_REPORT_ID_COLUMNS = ["incident_report_id", "report_id"] as const;

let resolvedInventoryTableName: string | null = null;
let resolvedIncidentReportsTableName: string | null = null;
let resolvedBrokenItemsTableName: string | null | undefined = undefined;

const INCIDENT_STATUSES = ["Pending", "In Review", "Resolved"] as const;
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

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type ReportStatusFilter = IncidentStatus | "All";
export type ReportSortOption = "most_recent" | "oldest";

export type ReportActionResult<T> = {
  data: T | null;
  error: string | null;
};

export interface DamagedItemInput {
  inventory_item_id: string;
  item_name?: string | null;
  damage_count: number;
  damage_notes?: string | null;
}

export interface IncidentReportCreateInput {
  user_id?: string | null;
  student_name: string;
  student_number: string;
  course_code: string;
  designation: string;
  contact_number: string;
  incident_datetime: string;
  location: string;
  witness_name?: string | null;
  instructor_name?: string | null;
  incident_description: string;
  injury_details?: string | null;
  response_notes?: string | null;
  status?: IncidentStatus;
  damaged_items: DamagedItemInput[];
}

export interface IncidentReportUpdateInput
  extends Partial<Omit<IncidentReportCreateInput, "user_id" | "damaged_items">> {
  damaged_items?: DamagedItemInput[];
}

export interface InventoryPickerItem {
  id: string;
  item_name: string;
  control_id: string | null;
  quantity: number;
}

export interface IncidentReportListItem {
  id: string;
  user_id?: string | null;
  student_name?: string | null;
  student_number?: string | null;
  course_code?: string | null;
  designation?: string | null;
  contact_number?: string | null;
  incident_datetime?: string | null;
  location?: string | null;
  witness_name?: string | null;
  instructor_name?: string | null;
  incident_description?: string | null;
  injury_details?: string | null;
  response_notes?: string | null;
  status: string;
  damaged_items: DamagedItemInput[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BrokenItemListRow {
  id: string;
  incident_report_id: string;
  inventory_item_id: string;
  item_name: string;
  damage_count: number;
  damage_notes: string;
  report_status: string;
  incident_datetime: string | null;
  created_at: string | null;
}

export interface ReportsDashboardData {
  stats: {
    total_items: number;
    available_items: number;
    in_use_items: number;
    broken_items: number;
  };
  broken_items: BrokenItemListRow[];
  incident_reports: IncidentReportListItem[];
}

type GenericRow = Record<string, unknown>;

const statusMap: Record<string, IncidentStatus> = {
  pending: "Pending",
  "in review": "In Review",
  in_review: "In Review",
  resolved: "Resolved",
};

const toInt = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const parseDateMs = (value: unknown): number => {
  const date = new Date(toStringValue(value));
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const normalizeStatus = (status: unknown): IncidentStatus => {
  const key = toStringValue(status).trim().toLowerCase();
  return statusMap[key] ?? "Pending";
};

const parseDamagedItemsArray = (value: unknown): DamagedItemInput[] => {
  if (!value) return [];

  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const normalized = parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const row = entry as GenericRow;
      const inventoryId =
        row.inventory_item_id ?? row.item_id ?? row.inventory_id ?? row.inventoryId ?? null;
      if (inventoryId === null || inventoryId === undefined) return null;

      const itemName =
        row.item_name ?? row.name ?? row.inventory_item_name ?? row.itemName ?? "";
      const notes = row.damage_notes ?? row.notes ?? row.remarks ?? "";
      const damageCount =
        row.damage_count ?? row.quantity_damaged ?? row.damaged_quantity ?? row.quantity ?? 0;

      const normalizedItem: DamagedItemInput = {
        inventory_item_id: toStringValue(inventoryId),
        item_name: toStringValue(itemName) || null,
        damage_count: toInt(damageCount),
        damage_notes: toStringValue(notes) || null,
      };

      if (!normalizedItem.inventory_item_id || normalizedItem.damage_count <= 0) {
        return null;
      }

      return normalizedItem;
    })
    .filter((item): item is DamagedItemInput => Boolean(item));

  return mergeDamagedItems(normalized);
};

const mergeDamagedItems = (items: DamagedItemInput[]): DamagedItemInput[] => {
  const merged = new Map<string, DamagedItemInput>();

  for (const item of items) {
    const id = toStringValue(item.inventory_item_id).trim();
    if (!id) continue;

    const quantity = toInt(item.damage_count);
    if (quantity <= 0) continue;

    const existing = merged.get(id);
    if (!existing) {
      merged.set(id, {
        inventory_item_id: id,
        item_name: item.item_name?.trim() || null,
        damage_count: quantity,
        damage_notes: item.damage_notes?.trim() || null,
      });
      continue;
    }

    merged.set(id, {
      inventory_item_id: id,
      item_name: existing.item_name || item.item_name?.trim() || null,
      damage_count: existing.damage_count + quantity,
      damage_notes: item.damage_notes?.trim() || existing.damage_notes || null,
    });
  }

  return Array.from(merged.values());
};

const normalizeInputDamagedItems = (items: DamagedItemInput[] | undefined): DamagedItemInput[] => {
  if (!items || items.length === 0) return [];

  return mergeDamagedItems(
    items.map((item) => ({
      inventory_item_id: toStringValue(item.inventory_item_id).trim(),
      item_name: item.item_name?.trim() || null,
      damage_count: toInt(item.damage_count),
      damage_notes: item.damage_notes?.trim() || null,
    })),
  );
};

const toDeltaMap = (items: DamagedItemInput[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const item of items) {
    const current = map.get(item.inventory_item_id) ?? 0;
    map.set(item.inventory_item_id, current + item.damage_count);
  }
  return map;
};

const invertDeltaMap = (delta: Map<string, number>): Map<string, number> => {
  const inverted = new Map<string, number>();
  for (const [id, value] of delta.entries()) {
    inverted.set(id, value * -1);
  }
  return inverted;
};

const buildUpdateDelta = (
  previousItems: DamagedItemInput[],
  nextItems: DamagedItemInput[],
): Map<string, number> => {
  const previous = toDeltaMap(previousItems);
  const next = toDeltaMap(nextItems);

  const ids = new Set<string>([...previous.keys(), ...next.keys()]);
  const delta = new Map<string, number>();

  for (const id of ids) {
    const oldValue = previous.get(id) ?? 0;
    const newValue = next.get(id) ?? 0;
    const diff = newValue - oldValue;

    if (diff !== 0) {
      delta.set(id, diff);
    }
  }

  return delta;
};

const revalidateReportsPages = (): void => {
  for (const path of REPORT_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
};

const readFirstAvailableDate = (row: GenericRow): string | null => {
  for (const key of REPORT_DATE_COLUMNS) {
    const value = row[key];
    if (value) return toStringValue(value);
  }
  return null;
};

const isColumnNotFoundError = (error: PostgrestError): boolean => {
  const msg = `${error.message} ${error.details || ""}`.toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
};

const isRelationNotFoundError = (error: PostgrestError): boolean => {
  const msg = `${error.message} ${error.details || ""}`.toLowerCase();
  return (
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    msg.includes("could not find the table")
  );
};

const resolveInventoryTableName = async (client: SupabaseClient): Promise<string> => {
  if (resolvedInventoryTableName) {
    return resolvedInventoryTableName;
  }

  for (const table of INVENTORY_TABLE_CANDIDATES) {
    const { error } = await client.from(table).select("id").limit(1);
    if (!error) {
      resolvedInventoryTableName = table;
      return table;
    }

    if (!isRelationNotFoundError(error)) {
      throw new Error(error.message);
    }
  }

  throw new Error(
    `Neither '${INVENTORY_ITEMS_TABLE}' nor '${INVENTORY_TABLE_FALLBACK}' exists in the public schema.`,
  );
};

const resolveIncidentReportsTableName = async (
  client: SupabaseClient,
): Promise<string> => {
  if (resolvedIncidentReportsTableName) {
    return resolvedIncidentReportsTableName;
  }

  for (const table of INCIDENT_REPORTS_TABLE_CANDIDATES) {
    const { error } = await client.from(table).select("id").limit(1);
    if (!error) {
      resolvedIncidentReportsTableName = table;
      return table;
    }

    if (!isRelationNotFoundError(error)) {
      throw new Error(error.message);
    }
  }

  throw new Error(INCIDENT_SCHEMA_SETUP_HINT);
};

const resolveBrokenItemsTableName = async (
  client: SupabaseClient,
): Promise<string | null> => {
  if (resolvedBrokenItemsTableName !== undefined) {
    return resolvedBrokenItemsTableName;
  }

  for (const table of BROKEN_ITEMS_TABLE_CANDIDATES) {
    const { error } = await client.from(table).select("id").limit(1);
    if (!error) {
      resolvedBrokenItemsTableName = table;
      return table;
    }

    if (!isRelationNotFoundError(error)) {
      throw new Error(error.message);
    }
  }

  resolvedBrokenItemsTableName = null;
  return null;
};

const resolveBrokenReportIdColumn = async (
  client: SupabaseClient,
): Promise<(typeof BROKEN_REPORT_ID_COLUMNS)[number] | null> => {
  const brokenItemsTable = await resolveBrokenItemsTableName(client);
  if (!brokenItemsTable) {
    return null;
  }

  for (const column of BROKEN_REPORT_ID_COLUMNS) {
    const { error } = await client.from(brokenItemsTable).select(column).limit(1);
    if (!error) {
      return column;
    }

    if (!isColumnNotFoundError(error)) {
      throw new Error(error.message);
    }
  }

  return "incident_report_id";
};

const loadBrokenItemsByReportId = async (
  client: SupabaseClient,
  reportId: string,
): Promise<DamagedItemInput[]> => {
  const brokenItemsTable = await resolveBrokenItemsTableName(client);
  if (!brokenItemsTable) {
    return [];
  }

  const reportIdColumn = await resolveBrokenReportIdColumn(client);
  if (!reportIdColumn) {
    return [];
  }

  const { data, error } = await client
    .from(brokenItemsTable)
    .select("*")
    .eq(reportIdColumn, reportId);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return parseDamagedItemsArray(data);
};

const replaceBrokenItemsForReport = async (
  client: SupabaseClient,
  reportId: string,
  damagedItems: DamagedItemInput[],
): Promise<void> => {
  const brokenItemsTable = await resolveBrokenItemsTableName(client);
  if (!brokenItemsTable) {
    return;
  }

  const reportIdColumn = await resolveBrokenReportIdColumn(client);
  if (!reportIdColumn) {
    return;
  }

  const { error: deleteError } = await client
    .from(brokenItemsTable)
    .delete()
    .eq(reportIdColumn, reportId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (damagedItems.length === 0) {
    return;
  }

  const primaryPayload = damagedItems.map((item) => ({
    [reportIdColumn]: reportId,
    inventory_item_id: item.inventory_item_id,
    item_name: item.item_name ?? null,
    damage_count: item.damage_count,
    damage_notes: item.damage_notes ?? null,
  }));

  const { error: primaryInsertError } = await client
    .from(brokenItemsTable)
    .insert(primaryPayload);

  if (!primaryInsertError) {
    return;
  }

  const fallbackPayload = damagedItems.map((item) => ({
    [reportIdColumn]: reportId,
    item_id: item.inventory_item_id,
    item_name: item.item_name ?? null,
    quantity_damaged: item.damage_count,
    notes: item.damage_notes ?? null,
  }));

  const { error: fallbackInsertError } = await client
    .from(brokenItemsTable)
    .insert(fallbackPayload);

  if (fallbackInsertError) {
    throw new Error(fallbackInsertError.message);
  }
};

const getCurrentDamagedItemsForReport = async (
  client: SupabaseClient,
  reportId: string,
  reportJsonItems: unknown,
): Promise<DamagedItemInput[]> => {
  try {
    const fromJoinTable = await loadBrokenItemsByReportId(client, reportId);
    if (fromJoinTable.length > 0) {
      return fromJoinTable;
    }
  } catch {
    // Fallback to damaged_items JSONB when join table access fails.
  }

  return parseDamagedItemsArray(reportJsonItems);
};

const rollbackQuantities = async (
  client: SupabaseClient,
  applied: Array<{ id: string; previousQuantity: number }>,
): Promise<void> => {
  const inventoryTable = await resolveInventoryTableName(client);

  for (const entry of applied.reverse()) {
    await client
      .from(inventoryTable)
      .update({ quantity: entry.previousQuantity })
      .eq("id", entry.id);
  }
};

const applyInventoryDeltaOrThrow = async (
  client: SupabaseClient,
  delta: Map<string, number>,
): Promise<void> => {
  if (delta.size === 0) {
    return;
  }

  const inventoryTable = await resolveInventoryTableName(client);

  const ids = Array.from(delta.keys());

  const { data, error } = await client
    .from(inventoryTable)
    .select("id, quantity")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as GenericRow[];
  const byId = new Map<string, GenericRow>(
    rows.map((row) => [toStringValue(row.id), row]),
  );

  for (const id of ids) {
    if (!byId.has(id)) {
      throw new Error(`Inventory item not found for id ${id}.`);
    }
  }

  const updates = ids.map((id) => {
    const row = byId.get(id)!;
    const current = toInt(row.quantity);
    const damageDelta = delta.get(id) ?? 0;
    const next = current - damageDelta;

    if (next < 0) {
      throw new Error(
        `Insufficient stock for inventory item ${id}. Requested change would result in negative quantity.`,
      );
    }

    return {
      id,
      previousQuantity: current,
      nextQuantity: next,
    };
  });

  const applied: Array<{ id: string; previousQuantity: number }> = [];

  try {
    for (const update of updates) {
      const { error: updateError } = await client
        .from(inventoryTable)
        .update({ quantity: update.nextQuantity })
        .eq("id", update.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      applied.push({
        id: update.id,
        previousQuantity: update.previousQuantity,
      });
    }
  } catch (error) {
    await rollbackQuantities(client, applied);
    throw error;
  }
};

const mapReportRow = (row: GenericRow): IncidentReportListItem => {
  return {
    id: toStringValue(row.id),
    user_id: toStringValue(row.user_id) || null,
    student_name: toStringValue(row.student_name) || null,
    student_number: toStringValue(row.student_number) || null,
    course_code: toStringValue(row.course_code) || null,
    designation: toStringValue(row.designation) || null,
    contact_number: toStringValue(row.contact_number) || null,
    incident_datetime:
      toStringValue(row.incident_datetime || row.date_time || row.incident_date) || null,
    location: toStringValue(row.location) || null,
    witness_name: toStringValue(row.witness_name) || null,
    instructor_name: toStringValue(row.instructor_name) || null,
    incident_description: toStringValue(row.incident_description) || null,
    injury_details: toStringValue(row.injury_details) || null,
    response_notes: toStringValue(row.response_notes ?? row.resolution_notes) || null,
    status: normalizeStatus(row.status),
    damaged_items: parseDamagedItemsArray(row.damaged_items),
    created_at: toStringValue(row.created_at) || null,
    updated_at: toStringValue(row.updated_at) || null,
  };
};

const sortReports = (
  rows: IncidentReportListItem[],
  sortBy: ReportSortOption,
): IncidentReportListItem[] => {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const aMs = parseDateMs(a.incident_datetime || a.created_at || "");
    const bMs = parseDateMs(b.incident_datetime || b.created_at || "");
    return sortBy === "oldest" ? aMs - bMs : bMs - aMs;
  });
  return sorted;
};

const filterReportsByStatus = (
  rows: IncidentReportListItem[],
  status: ReportStatusFilter,
): IncidentReportListItem[] => {
  if (status === "All") {
    return rows;
  }

  return rows.filter((row) => normalizeStatus(row.status) === status);
};

export async function getInventoryItemsForDamagePicker(
  search: string = "",
): Promise<ReportActionResult<InventoryPickerItem[]>> {
  try {
    const client = getSupabaseServerClient();
    const inventoryTable = await resolveInventoryTableName(client);

    const { data, error } = await client
      .from(inventoryTable)
      .select("*");

    if (error) {
      return { data: null, error: error.message };
    }

    const rows = (data || []) as GenericRow[];
    const keyword = search.trim().toLowerCase();

    const items = rows
      .map((row) => {
        const id = toStringValue(row.id).trim();
        const itemName =
          toStringValue(row.item_name || row.name || row.inventory_name).trim();
        const quantity = toInt(row.quantity);

        if (!id || !itemName) {
          return null;
        }

        return {
          id,
          item_name: itemName,
          control_id: toStringValue(row.control_id ?? row.controlId) || null,
          quantity,
        };
      })
      .filter((item): item is InventoryPickerItem => Boolean(item))
      .filter((item) => {
        if (!keyword) return true;
        return (
          item.item_name.toLowerCase().includes(keyword) ||
          item.id.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => {
        const byName = a.item_name.localeCompare(b.item_name);
        if (byName !== 0) return byName;
        return (a.control_id || "").localeCompare(b.control_id || "");
      });

    return { data: items, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load inventory items.";
    return { data: null, error: message };
  }
}

export async function getIncidentReports(options?: {
  status?: ReportStatusFilter;
  sortBy?: ReportSortOption;
}): Promise<ReportActionResult<IncidentReportListItem[]>> {
  try {
    const client = getSupabaseServerClient();
    const incidentReportsTable = await resolveIncidentReportsTableName(client);
    const status = options?.status ?? "All";
    const sortBy = options?.sortBy ?? "most_recent";

    const { data, error } = await client
      .from(incidentReportsTable)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const rows = (data || []) as GenericRow[];
    const mapped = rows.map(mapReportRow);
    const filtered = filterReportsByStatus(mapped, status);

    return { data: sortReports(filtered, sortBy), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load incident reports.";
    return { data: null, error: message };
  }
}

export async function getReportsDashboardData(options?: {
  status?: ReportStatusFilter;
  sortBy?: ReportSortOption;
}): Promise<ReportActionResult<ReportsDashboardData>> {
  try {
    const client = getSupabaseServerClient();
    const inventoryTable = await resolveInventoryTableName(client);
    const incidentReportsTable = await resolveIncidentReportsTableName(client);
    const brokenItemsTable = await resolveBrokenItemsTableName(client);
    const statusFilter = options?.status ?? "All";
    const sortBy = options?.sortBy ?? "most_recent";

    const [inventoryRes, reportsRes, brokenRes] = await Promise.all([
      client.from(inventoryTable).select("*"),
      client.from(incidentReportsTable).select("*").order("created_at", { ascending: false }),
      brokenItemsTable
        ? client.from(brokenItemsTable).select("*")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (inventoryRes.error) {
      return { data: null, error: inventoryRes.error.message };
    }
    if (reportsRes.error) {
      return { data: null, error: reportsRes.error.message };
    }
    if (brokenRes.error) {
      return { data: null, error: brokenRes.error.message };
    }

    const inventoryRows = (inventoryRes.data || []) as GenericRow[];
    const reportRows = (reportsRes.data || []) as GenericRow[];
    const brokenRows = (brokenRes.data || []) as GenericRow[];

    const reports = sortReports(
      filterReportsByStatus(reportRows.map(mapReportRow), statusFilter),
      sortBy,
    );

    const reportById = new Map<string, IncidentReportListItem>(
      reports.map((report) => [report.id, report]),
    );

    const brokenItemsFromJoin = brokenRows
      .map((row) => {
        const reportId = toStringValue(
          row.incident_report_id ?? row.report_id ?? row.incidentId,
        );
        if (!reportId) return null;

        const linkedReport = reportById.get(reportId);
        if (!linkedReport) return null;

        const itemId = toStringValue(
          row.inventory_item_id ?? row.item_id ?? row.inventory_id,
        );
        const itemName = toStringValue(
          row.item_name ?? row.inventory_item_name ?? row.name,
        );
        const damageCount = toInt(
          row.damage_count ?? row.quantity_damaged ?? row.quantity,
        );

        if (!itemId || !itemName || damageCount <= 0) {
          return null;
        }

        const id = toStringValue(row.id) || `${reportId}-${itemId}`;

        return {
          id,
          incident_report_id: reportId,
          inventory_item_id: itemId,
          item_name: itemName,
          damage_count: damageCount,
          damage_notes: toStringValue(row.damage_notes ?? row.notes ?? ""),
          report_status: linkedReport.status,
          incident_datetime:
            linkedReport.incident_datetime || linkedReport.created_at || null,
          created_at:
            toStringValue(row.created_at) || linkedReport.created_at || null,
        } satisfies BrokenItemListRow;
      })
      .filter((item): item is BrokenItemListRow => Boolean(item));

    const joinItemKeys = new Set(
      brokenItemsFromJoin.map(
        (item) => `${item.incident_report_id}:${item.inventory_item_id}`,
      ),
    );

    const brokenItemsFromJson = reports.flatMap((report) => {
      return (report.damaged_items || [])
        .map((item, index) => {
          const inventoryItemId = toStringValue(item.inventory_item_id);
          if (!inventoryItemId || item.damage_count <= 0) {
            return null;
          }

          const key = `${report.id}:${inventoryItemId}`;
          if (joinItemKeys.has(key)) {
            return null;
          }

          return {
            id: `${report.id}-${inventoryItemId}-${index}`,
            incident_report_id: report.id,
            inventory_item_id: inventoryItemId,
            item_name: item.item_name || inventoryItemId,
            damage_count: toInt(item.damage_count),
            damage_notes: toStringValue(item.damage_notes),
            report_status: report.status,
            incident_datetime: report.incident_datetime || report.created_at || null,
            created_at: report.created_at || null,
          } satisfies BrokenItemListRow;
        })
        .filter((entry): entry is BrokenItemListRow => Boolean(entry));
    });

    const brokenItems = [...brokenItemsFromJoin, ...brokenItemsFromJson];

    const availableItems = inventoryRows.reduce(
      (sum, row) => sum + toInt(row.quantity),
      0,
    );

    const inferredInUse = inventoryRows.reduce((sum, row) => {
      const explicit = toInt(
        row.in_use_quantity ?? row.in_use ?? row.borrowed_quantity,
      );
      return sum + explicit;
    }, 0);

    const inUseItems =
      inferredInUse > 0
        ? inferredInUse
        : reports.filter((report) => normalizeStatus(report.status) === "In Review").length;

    const brokenItemsCount = brokenItems.reduce(
      (sum, item) => sum + toInt(item.damage_count),
      0,
    );

    const data: ReportsDashboardData = {
      stats: {
        total_items: availableItems + brokenItemsCount + inUseItems,
        available_items: availableItems,
        in_use_items: inUseItems,
        broken_items: brokenItemsCount,
      },
      broken_items: brokenItems,
      incident_reports: reports,
    };

    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data.";
    return { data: null, error: message };
  }
}

export async function createIncidentReportWithInventorySync(
  payload: IncidentReportCreateInput,
): Promise<ReportActionResult<IncidentReportListItem>> {
  try {
    const client = getSupabaseServerClient();
    const incidentReportsTable = await resolveIncidentReportsTableName(client);
    const ownerUserId =
      payload.user_id ||
      process.env.STUDENT_REPORT_OWNER_USER_ID ||
      process.env.NEXT_PUBLIC_STUDENT_REPORT_OWNER_USER_ID ||
      null;

    const damagedItems = normalizeInputDamagedItems(payload.damaged_items);

    const createDelta = toDeltaMap(damagedItems);
    await applyInventoryDeltaOrThrow(client, createDelta);

    let reportId: string | null = null;

    try {
      const insertPayload = {
        user_id: ownerUserId,
        student_name: payload.student_name,
        student_number: payload.student_number,
        course_code: payload.course_code,
        designation: payload.designation,
        contact_number: payload.contact_number,
        incident_datetime: payload.incident_datetime,
        location: payload.location,
        witness_name: payload.witness_name ?? null,
        instructor_name: payload.instructor_name ?? null,
        incident_description: payload.incident_description,
        injury_details: payload.injury_details ?? null,
        status: normalizeStatus(payload.status),
        damaged_items: damagedItems,
        ...(payload.response_notes !== undefined
          ? { response_notes: payload.response_notes ?? null }
          : {}),
      };

      let { data, error } = await client
        .from(incidentReportsTable)
        .insert([insertPayload])
        .select("*")
        .single();

      if (error && isColumnNotFoundError(error) && "response_notes" in insertPayload) {
        const fallbackPayload = { ...insertPayload } as Record<string, unknown>;
        delete fallbackPayload.response_notes;

        const retry = await client
          .from(incidentReportsTable)
          .insert([fallbackPayload])
          .select("*")
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw new Error(error.message);
      }

      reportId = toStringValue((data as GenericRow).id);
      await replaceBrokenItemsForReport(client, reportId, damagedItems);

      revalidateReportsPages();

      return { data: mapReportRow(data as GenericRow), error: null };
    } catch (error) {
      await applyInventoryDeltaOrThrow(client, invertDeltaMap(createDelta));

      if (reportId) {
        await client.from(incidentReportsTable).delete().eq("id", reportId);
      }

      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create incident report with inventory sync.";
    return { data: null, error: message };
  }
}

export async function updateIncidentReportWithInventorySync(
  reportId: string,
  payload: IncidentReportUpdateInput,
): Promise<ReportActionResult<IncidentReportListItem>> {
  try {
    const client = getSupabaseServerClient();
    const incidentReportsTable = await resolveIncidentReportsTableName(client);

    const { data: currentReport, error: reportError } = await client
      .from(incidentReportsTable)
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError) {
      return { data: null, error: reportError.message };
    }

    const currentRow = currentReport as GenericRow;
    const previousDamagedItems = await getCurrentDamagedItemsForReport(
      client,
      reportId,
      currentRow.damaged_items,
    );

    const nextDamagedItems = payload.damaged_items
      ? normalizeInputDamagedItems(payload.damaged_items)
      : previousDamagedItems;

    const updateDelta = buildUpdateDelta(previousDamagedItems, nextDamagedItems);
    await applyInventoryDeltaOrThrow(client, updateDelta);

    try {
      const updatePayload: GenericRow = {
        student_name: payload.student_name ?? currentRow.student_name,
        student_number: payload.student_number ?? currentRow.student_number,
        course_code: payload.course_code ?? currentRow.course_code,
        designation: payload.designation ?? currentRow.designation,
        contact_number: payload.contact_number ?? currentRow.contact_number,
        incident_datetime:
          payload.incident_datetime ?? currentRow.incident_datetime ?? currentRow.date_time,
        location: payload.location ?? currentRow.location,
        witness_name:
          payload.witness_name !== undefined
            ? payload.witness_name
            : currentRow.witness_name,
        instructor_name:
          payload.instructor_name !== undefined
            ? payload.instructor_name
            : currentRow.instructor_name,
        incident_description:
          payload.incident_description ?? currentRow.incident_description,
        injury_details:
          payload.injury_details !== undefined
            ? payload.injury_details
            : currentRow.injury_details,
        status:
          payload.status !== undefined
            ? normalizeStatus(payload.status)
            : normalizeStatus(currentRow.status),
        damaged_items: nextDamagedItems,
        updated_at: new Date().toISOString(),
      };

      if (payload.response_notes !== undefined) {
        updatePayload.response_notes = payload.response_notes ?? null;
      }

      let { data: updated, error: updateError } = await client
        .from(incidentReportsTable)
        .update(updatePayload)
        .eq("id", reportId)
        .select("*")
        .single();

      if (
        updateError &&
        isColumnNotFoundError(updateError) &&
        Object.prototype.hasOwnProperty.call(updatePayload, "response_notes")
      ) {
        const fallbackPayload = { ...updatePayload } as Record<string, unknown>;
        delete fallbackPayload.response_notes;

        const retry = await client
          .from(incidentReportsTable)
          .update(fallbackPayload)
          .eq("id", reportId)
          .select("*")
          .single();

        updated = retry.data;
        updateError = retry.error;
      }

      if (updateError) {
        throw new Error(updateError.message);
      }

      await replaceBrokenItemsForReport(client, reportId, nextDamagedItems);

      revalidateReportsPages();

      return { data: mapReportRow(updated as GenericRow), error: null };
    } catch (error) {
      await applyInventoryDeltaOrThrow(client, invertDeltaMap(updateDelta));
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update incident report with inventory sync.";
    return { data: null, error: message };
  }
}

export async function deleteIncidentReportWithInventorySync(
  reportId: string,
): Promise<ReportActionResult<{ id: string }>> {
  try {
    const client = getSupabaseServerClient();
    const incidentReportsTable = await resolveIncidentReportsTableName(client);

    const { data: reportData, error: reportError } = await client
      .from(incidentReportsTable)
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError) {
      return { data: null, error: reportError.message };
    }

    const currentRow = reportData as GenericRow;
    const damagedItems = await getCurrentDamagedItemsForReport(
      client,
      reportId,
      currentRow.damaged_items,
    );

    const restoreDelta = invertDeltaMap(toDeltaMap(damagedItems));
    await applyInventoryDeltaOrThrow(client, restoreDelta);

    try {
      const brokenItemsTable = await resolveBrokenItemsTableName(client);
      const reportIdColumn = await resolveBrokenReportIdColumn(client);
      if (brokenItemsTable && reportIdColumn) {
        const { error: deleteBrokenError } = await client
          .from(brokenItemsTable)
          .delete()
          .eq(reportIdColumn, reportId);

        if (deleteBrokenError) {
          throw new Error(deleteBrokenError.message);
        }
      }

      const { error: deleteReportError } = await client
        .from(incidentReportsTable)
        .delete()
        .eq("id", reportId);

      if (deleteReportError) {
        throw new Error(deleteReportError.message);
      }

      revalidateReportsPages();

      return {
        data: { id: reportId },
        error: null,
      };
    } catch (error) {
      await applyInventoryDeltaOrThrow(client, invertDeltaMap(restoreDelta));
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete incident report with inventory sync.";
    return { data: null, error: message };
  }
}

export async function updateIncidentReportStatus(
  reportId: string,
  status: IncidentStatus,
  actorRole?: string,
): Promise<ReportActionResult<{ id: string; status: IncidentStatus }>> {
  try {
    const normalizedRole = toStringValue(actorRole).trim().toLowerCase();
    if (!STATUS_EDITOR_ROLES.has(normalizedRole)) {
      return {
        data: null,
        error: "Only authorized Personnel/Admin users can update incident status.",
      };
    }

    const client = getSupabaseServerClient();
    const incidentReportsTable = await resolveIncidentReportsTableName(client);

    const normalized = normalizeStatus(status);

    const { error } = await client
      .from(incidentReportsTable)
      .update({ status: normalized, updated_at: new Date().toISOString() })
      .eq("id", reportId);

    if (error) {
      return { data: null, error: error.message };
    }

    revalidateReportsPages();

    return { data: { id: reportId, status: normalized }, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update incident report status.";
    return { data: null, error: message };
  }
}

export async function getIncidentReportById(
  reportId: string,
): Promise<ReportActionResult<IncidentReportListItem>> {
  try {
    const client = getSupabaseServerClient();
    const incidentReportsTable = await resolveIncidentReportsTableName(client);

    const { data, error } = await client
      .from(incidentReportsTable)
      .select("*")
      .eq("id", reportId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped = mapReportRow(data as GenericRow);
    if (!mapped.damaged_items || mapped.damaged_items.length === 0) {
      mapped.damaged_items = await getCurrentDamagedItemsForReport(
        client,
        reportId,
        (data as GenericRow).damaged_items,
      );
    }

    return { data: mapped, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load incident report.";
    return { data: null, error: message };
  }
}
