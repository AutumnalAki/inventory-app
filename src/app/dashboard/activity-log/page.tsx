
"use client";

import React, { useEffect, useState } from "react";
import { useInventory } from "@/context/InventoryContext";
import { useRole } from "@/context/RoleContext";

const ROLE_LEVELS: Record<string, number> = {
  "Developer": 100,
  "Administrator": 80,
  "Program Chair": 60,
  "Faculty": 60,
  "ME Lab": 40,
  "CE Lab": 40,
  "ECE Lab": 40,
  "CPE Lab": 40,
  "CHEM Lab": 40,
  "PHYS Lab": 40,
  "EE Lab": 40,
  "Student": 10
};

function canAccessActivityLog(role: string) {
  return ROLE_LEVELS[role] >= 60;
}

export default function ActivityLogPage() {
  const { logs, users, refreshData } = useInventory();
  const { role, loading } = useRole();
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // Build a map of userId to username for display
    const map: Record<string, string> = {};
    users.forEach(u => {
      map[String(u.id)] = u.name || u.email || String(u.id);
    });
    setUserMap(map);
  }, [users]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Activity Log</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!canAccessActivityLog(role)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Activity Log</h1>
        <p className="text-red-500 font-semibold">Access denied. Only Faculty and above can view the Activity Log.</p>
      </div>
    );
  }

  // Export logs to CSV
  const handleExport = () => {
    if (logs.length === 0) return;
    const headers = ["Date & Time", "User", "Action", "Details", "Location"];
    const rows = logs.map(log => [
      log.time,
      userMap[String(log.user_id ?? "")] || "-",
      log.action,
      log.item,
      log.location
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Activity_Log.csv";
    link.click();
  };

  // Clear all logs
  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all activity logs? This cannot be undone.")) return;
    setClearing(true);
    // Use Supabase directly to delete all logs
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("activity_log").delete().neq("id", 0); // delete all
    setClearing(false);
    refreshData();
  };

  // Group logs by date (YYYY-MM-DD)
  const logsByDate: Record<string, typeof logs> = {};
  logs.forEach(log => {
    // Try to extract date in YYYY-MM-DD from log.time
    let dateStr = "Unknown";
    if (log.time) {
      const d = new Date(log.time);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        // fallback: try splitting by space or T
        dateStr = String(log.time).split(' ')[0];
      }
    }
    if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
    logsByDate[dateStr].push(log);
  });
  const sortedDates = Object.keys(logsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Export CSV</button>
          <button onClick={handleClear} disabled={clearing} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50">{clearing ? "Clearing..." : "Clear Log"}</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No activity logs found.</div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="mb-6">
              <div className="bg-black/20 px-4 py-2 font-bold text-white rounded-t-lg border-b border-white/10 text-sm sticky top-0 z-10">{date}</div>
              <table className="min-w-full text-sm text-left">
                <thead className="bg-black/10">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date & Time</th>
                    <th className="px-4 py-2 font-semibold">User</th>
                    <th className="px-4 py-2 font-semibold">Action</th>
                    <th className="px-4 py-2 font-semibold">Details</th>
                    <th className="px-4 py-2 font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {logsByDate[date].map(log => (
                    <tr key={log.id} className="border-t border-white/5 hover:bg-white/10 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">{log.time}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{userMap[String(log.user_id ?? "")] || "-"}</td>
                      <td className="px-4 py-2">{log.action}</td>
                      <td className="px-4 py-2">{log.item}</td>
                      <td className="px-4 py-2">{log.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
