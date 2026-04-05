"use client";

import React, { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  PackageSearch,
  Wrench,
} from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useRole } from "@/context/RoleContext";

const ROLE_LAB_DB_MAPPING: Record<string, string> = {
  "ME Lab": "Mechanical Engineering Laboratory",
  "CE Lab": "Civil Engineering Laboratory",
  "ECE Lab": "ECE Laboratory",
  "CPE Lab": "Computer Laboratory",
  "CHEM Lab": "Chemistry Laboratory",
  "PHYS Lab": "Physics Laboratory",
  "EE Lab": "Electrical Engineering Laboratory",
  "Central Storage Room": "Central Storage Room",
};

const FULL_ACCESS_ROLES = [
  "Developer",
  "SuperAdmin",
  "Administrator",
  "Program Chair",
  "Faculty",
];

const toPercent = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return (value / total) * 100;
};

const labelizeStatus = (status: string): string => {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        <div className={`rounded-xl border border-white/10 p-2.5 ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { inventory, loans, reservations } = useInventory();
  const { role } = useRole();

  const isLabRestricted =
    !FULL_ACCESS_ROLES.includes(role) && Boolean(ROLE_LAB_DB_MAPPING[role]);
  const userLabDbName = isLabRestricted ? ROLE_LAB_DB_MAPPING[role] : null;

  const filteredInventory = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return inventory.filter((item) => item.location === userLabDbName);
    }
    return inventory;
  }, [inventory, isLabRestricted, userLabDbName]);

  const filteredLoans = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return loans.filter((loan) => loan.location === userLabDbName);
    }
    return loans;
  }, [loans, isLabRestricted, userLabDbName]);

  const filteredReservations = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return reservations.filter((reservation) => reservation.location === userLabDbName);
    }
    return reservations;
  }, [reservations, isLabRestricted, userLabDbName]);

  const totals = useMemo(() => {
    const totalSkus = filteredInventory.length;
    const totalUnits = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
    const availableUnits = filteredInventory
      .filter((item) => item.condition === "Available")
      .reduce((sum, item) => sum + item.quantity, 0);
    const brokenUnits = filteredInventory
      .filter((item) => item.condition === "Broken")
      .reduce((sum, item) => sum + item.quantity, 0);
    const repairUnits = filteredInventory
      .filter((item) => item.condition === "For Repairs")
      .reduce((sum, item) => sum + item.quantity, 0);
    const borrowedUnits = filteredLoans
      .filter((loan) => loan.status === "Borrowed")
      .reduce((sum, loan) => sum + loan.qty, 0);

    const lowStockItems = filteredInventory.filter(
      (item) => item.stock === "Low Stock" || item.stock === "Out of Stock",
    );
    const outOfStockItems = filteredInventory.filter((item) => item.stock === "Out of Stock");

    const pendingReservations = filteredReservations.filter(
      (reservation) => reservation.status === "pending",
    ).length;

    return {
      totalSkus,
      totalUnits,
      availableUnits,
      borrowedUnits,
      brokenUnits,
      repairUnits,
      lowStockItems,
      outOfStockItems,
      pendingReservations,
    };
  }, [filteredInventory, filteredLoans, filteredReservations]);

  const stockSegments = useMemo(() => {
    const segments = [
      {
        id: "available",
        label: "Available",
        value: totals.availableUnits,
        color: "#34d399",
      },
      {
        id: "borrowed",
        label: "In Use",
        value: totals.borrowedUnits,
        color: "#60a5fa",
      },
      {
        id: "broken",
        label: "Broken",
        value: totals.brokenUnits,
        color: "#f87171",
      },
      {
        id: "repair",
        label: "For Repairs",
        value: totals.repairUnits,
        color: "#fbbf24",
      },
    ];

    const positive = segments.filter((segment) => segment.value > 0);
    if (positive.length === 0) {
      return segments.map((segment) => ({ ...segment, percentage: 0 }));
    }

    const total = positive.reduce((sum, segment) => sum + segment.value, 0);
    return segments.map((segment) => ({
      ...segment,
      percentage: toPercent(segment.value, total),
    }));
  }, [totals.availableUnits, totals.borrowedUnits, totals.brokenUnits, totals.repairUnits]);

  const donutStyle = useMemo(() => {
    let cursor = 0;
    const parts = stockSegments
      .filter((segment) => segment.percentage > 0)
      .map((segment) => {
        const start = cursor;
        cursor += segment.percentage;
        return `${segment.color} ${start}% ${cursor}%`;
      });

    if (parts.length === 0) {
      return { background: "conic-gradient(#1f2937 0 100%)" };
    }

    return { background: `conic-gradient(${parts.join(", ")})` };
  }, [stockSegments]);

  const locationDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filteredInventory) {
      map.set(item.location, (map.get(item.location) || 0) + item.quantity);
    }

    return Array.from(map.entries())
      .map(([location, units]) => ({ location, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [filteredInventory]);

  const maxLocationUnits = locationDistribution[0]?.units || 1;

  const operationsBars = useMemo(() => {
    const activeLoans = filteredLoans.filter((loan) => loan.status === "Borrowed").length;
    const pendingReservations = filteredReservations.filter(
      (reservation) => reservation.status === "pending",
    ).length;
    const approvedReservations = filteredReservations.filter(
      (reservation) => reservation.status === "approved",
    ).length;
    const completedReservations = filteredReservations.filter(
      (reservation) => reservation.status === "completed",
    ).length;

    const bars = [
      { label: "Active Loans", value: activeLoans, color: "bg-blue-500" },
      { label: "Pending Reservations", value: pendingReservations, color: "bg-amber-500" },
      { label: "Approved Reservations", value: approvedReservations, color: "bg-emerald-500" },
      { label: "Completed Reservations", value: completedReservations, color: "bg-gray-500" },
    ];

    const max = Math.max(1, ...bars.map((bar) => bar.value));

    return bars.map((bar) => ({
      ...bar,
      percentage: (bar.value / max) * 100,
    }));
  }, [filteredLoans, filteredReservations]);

  const topDemandItems = useMemo(() => {
    const map = new Map<string, number>();

    for (const loan of filteredLoans) {
      if (loan.status !== "Borrowed") continue;
      map.set(loan.itemName, (map.get(loan.itemName) || 0) + loan.qty);
    }

    return Array.from(map.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [filteredLoans]);

  const recommendationItems = useMemo(() => {
    const items: string[] = [];

    if (totals.lowStockItems.length > 0) {
      items.push(
        `${totals.lowStockItems.length} equipment items are at low/out-of-stock. Prioritize replenishment requests this week.`,
      );
    }

    if (totals.brokenUnits > 0 || totals.repairUnits > 0) {
      items.push(
        `${totals.brokenUnits + totals.repairUnits} units are unavailable (broken/for repair). Schedule maintenance and reassess replacement budget.`,
      );
    }

    if (totals.pendingReservations > 0) {
      items.push(
        `${totals.pendingReservations} reservations are waiting for action. Review approvals to avoid laboratory delays.`,
      );
    }

    if (topDemandItems.length > 0) {
      items.push(
        `High usage item: ${topDemandItems[0].name} (${topDemandItems[0].qty} units currently borrowed). Consider safety stock uplift.`,
      );
    }

    if (items.length === 0) {
      items.push("Inventory health is stable. Continue weekly checks and keep incident monitoring active.");
    }

    return items;
  }, [totals, topDemandItems]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Analysis</h1>
        <p className="mt-1 text-sm text-gray-400">
          Visual inventory intelligence to support planning and next actions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
        <StatCard
          label="Total Units"
          value={totals.totalUnits}
          hint={`${totals.totalSkus} unique equipment entries`}
          icon={Boxes}
          tone="bg-indigo-500/20 text-indigo-100"
        />
        <StatCard
          label="Available"
          value={totals.availableUnits}
          hint="Ready for use"
          icon={CheckCircle2}
          tone="bg-emerald-500/20 text-emerald-100"
        />
        <StatCard
          label="In Use"
          value={totals.borrowedUnits}
          hint="Currently borrowed"
          icon={ClipboardList}
          tone="bg-blue-500/20 text-blue-100"
        />
        <StatCard
          label="Unavailable"
          value={totals.brokenUnits + totals.repairUnits}
          hint="Broken + for repairs"
          icon={Wrench}
          tone="bg-amber-500/20 text-amber-100"
        />
        <StatCard
          label="Risk Alerts"
          value={totals.lowStockItems.length}
          hint={`${totals.outOfStockItems.length} out-of-stock`}
          icon={AlertTriangle}
          tone="bg-red-500/20 text-red-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={17} className="text-indigo-300" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Stock Composition</h2>
          </div>

          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
            <div className="relative h-44 w-44 rounded-full" style={donutStyle}>
              <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-[#0b0b0b] text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{totals.totalUnits}</p>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500">Units</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-2">
              {stockSegments.map((segment) => (
                <div key={segment.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 text-gray-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
                      {segment.label}
                    </span>
                    <span className="text-gray-500">
                      {segment.value} ({segment.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${segment.percentage}%`, background: segment.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <PackageSearch size={17} className="text-indigo-300" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Inventory By Location</h2>
          </div>

          <div className="space-y-3">
            {locationDistribution.map((entry) => (
              <div key={entry.location}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-gray-300">{entry.location}</span>
                  <span className="text-gray-500">{entry.units}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${(entry.units / maxLocationUnits) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            {locationDistribution.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-500">
                No inventory location data available.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-300">Operational Workload</h2>

          <div className="grid grid-cols-2 gap-3">
            {operationsBars.map((bar) => (
              <div key={bar.label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-gray-300">{bar.label}</span>
                  <span className="font-semibold text-white">{bar.value}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className={`h-2 rounded-full ${bar.color}`} style={{ width: `${bar.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-gray-400">
            Reservation statuses considered: {Array.from(new Set(filteredReservations.map((r) => labelizeStatus(r.status)))).join(", ") || "No data"}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-300">High-Demand Equipment</h2>

          <div className="space-y-2">
            {topDemandItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <span className="text-gray-200">{item.name}</span>
                <span className="font-semibold text-blue-300">{item.qty} in use</span>
              </div>
            ))}

            {topDemandItems.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-500">
                No active loan demand at the moment.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-300">Priority Watchlist</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Control ID</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Threshold</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {totals.lowStockItems.slice(0, 10).map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3 text-gray-200">{item.name}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{item.controlId || "-"}</td>
                    <td className="py-2 pr-3 text-gray-300">{item.quantity}</td>
                    <td className="py-2 pr-3 text-gray-500">{item.low_stock_threshold ?? 5}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                          item.stock === "Out of Stock"
                            ? "border-red-500/40 bg-red-500/15 text-red-300"
                            : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {item.stock}
                      </span>
                    </td>
                  </tr>
                ))}
                {totals.lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No low-stock or out-of-stock items detected.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-300">Recommended Next Actions</h2>
          <div className="space-y-2">
            {recommendationItems.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
