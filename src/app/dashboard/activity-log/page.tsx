
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
  const { logs, users } = useInventory();
  const { role, loading } = useRole();
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Build a map of userId to username for display
    const map: Record<string, string> = {};
    users.forEach(u => {
      map[u.id] = u.name || u.email || u.id;
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activity Log</h1>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
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
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">No activity logs found.</td>
              </tr>
            )}
            {logs.map(log => (
              <tr key={log.id} className="border-t border-white/5 hover:bg-white/10 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap">{log.time}</td>
                <td className="px-4 py-2 whitespace-nowrap">{userMap[log.user_id] || "-"}</td>
                <td className="px-4 py-2">{log.action}</td>
                <td className="px-4 py-2">{log.item}</td>
                <td className="px-4 py-2">{log.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
