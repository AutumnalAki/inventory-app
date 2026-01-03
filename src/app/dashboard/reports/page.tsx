"use client";

import React, { useState, useMemo } from "react";
import { 
  Download, Calendar, Box, FileText, 
  AlertTriangle, TrendingUp, AlertOctagon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInventory } from "@/context/InventoryContext";

export default function ReportsPage() {
  // 1. Get Real Data
  const { inventory, loans, logs } = useInventory();
  const [hoveredSegment, setHoveredSegment] = useState<any>(null);
  const [dateRange, setDateRange] = useState("This Month");

  // 2. Real Stats Logic
  const totalItems = inventory.reduce((acc, i) => acc + i.quantity, 0);
  const brokenItems = inventory.filter(i => i.condition === "Broken"); // Actual list of broken items
  const inUseItems = loans.filter(l => l.status === "Borrowed").reduce((acc, l) => acc + l.qty, 0);
  const availableItems = totalItems - inUseItems - brokenItems.length;

  // 3. Dynamic Charts
  const chartData = useMemo(() => {
    const total = totalItems || 1;
    const data = [
      { id: "available", label: "Available", value: availableItems, color: "#10b981" },
      { id: "used", label: "In Use", value: inUseItems, color: "#3b82f6" },
      { id: "broken", label: "Broken", value: brokenItems.length, color: "#ef4444" },
    ];
    let currentOffset = 0;
    return data.map(item => {
      const percentage = item.value / total;
      const strokeLength = (2 * Math.PI * 40) * percentage;
      const strokeDasharray = `${strokeLength} ${2 * Math.PI * 40}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += strokeLength;
      return { ...item, strokeDasharray, strokeDashoffset };
    });
  }, [totalItems, availableItems, inUseItems, brokenItems.length]);

  const locationCounts = useMemo(() => {
     const counts: Record<string, number> = {};
     inventory.forEach(item => { counts[item.location] = (counts[item.location] || 0) + item.quantity; });
     return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [inventory]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center"><h1 className="text-3xl font-bold">Reports</h1></div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Items" value={totalItems} icon={Box} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard title="Available" value={availableItems} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard title="In Use" value={inUseItems} icon={FileText} color="bg-blue-500/10 text-blue-400" />
          <StatCard title="Broken" value={brokenItems.length} icon={AlertOctagon} color="bg-red-500/10 text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative min-h-[320px]">
            <h3 className="absolute top-6 left-6 text-lg font-bold">Item Condition</h3>
            <div className="relative w-56 h-56 mt-6">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="12" fill="none" className="opacity-30" />
                    {chartData.map((segment) => (
                      <motion.circle key={segment.id} cx="50" cy="50" r="40" fill="none" stroke={segment.color} strokeWidth="12" strokeDasharray={segment.strokeDasharray} strokeDashoffset={segment.strokeDashoffset}
                        initial={{ strokeDasharray: "0 251" }} animate={{ strokeDasharray: segment.strokeDasharray }} onMouseEnter={() => setHoveredSegment(segment)} onMouseLeave={() => setHoveredSegment(null)}
                        className="cursor-pointer transition-all duration-300 hover:opacity-100 opacity-90 hover:stroke-[14px]"
                      />
                    ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                   <p className="text-3xl font-bold text-white tabular-nums">{hoveredSegment ? hoveredSegment.value : totalItems}</p>
                   <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{hoveredSegment ? hoveredSegment.label : "Total"}</p>
                </div>
            </div>
        </div>

        {/* Location Bars */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[320px]">
             <h3 className="text-lg font-bold mb-6">Inventory by Location</h3>
             <div className="space-y-6">
                {locationCounts.map(l => (
                    <div key={l.label}>
                        <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-300">{l.label}</span><span className="text-gray-500">{l.count}</span></div>
                        <div className="w-full bg-white/5 rounded-full h-2"><div style={{ width: `${(l.count / (totalItems || 1)) * 100}%` }} className="h-full rounded-full bg-indigo-500" /></div>
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Broken Items Table - Connected to Real Data */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-red-500/5">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-400" />
                    <h3 className="font-bold text-white">Damaged / Broken Items Report</h3>
                </div>
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full">
                    {brokenItems.length} Items
                </span>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-gray-500 border-b border-white/10 text-[10px] uppercase tracking-wider">
                        <th className="p-4 font-semibold">Item Name</th>
                        <th className="p-4 font-semibold">Control ID</th>
                        <th className="p-4 font-semibold">Category</th>
                        <th className="p-4 font-semibold">Remarks</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {brokenItems.map(item => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-medium text-white">{item.name}</td>
                            <td className="p-4 text-gray-400 font-mono text-xs">{item.controlId}</td>
                            <td className="p-4 text-gray-300">{item.category}</td>
                            <td className="p-4 text-red-400 text-xs">{item.remarks}</td>
                        </tr>
                    ))}
                    {brokenItems.length === 0 && (
                        <tr><td colSpan={4} className="p-6 text-center text-gray-500">No broken items reported. Good job!</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
    return <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <div><p className="text-xs text-gray-400 font-bold uppercase">{title}</p><h3 className="text-2xl font-bold text-white">{value}</h3></div>
        <div className={`p-3 rounded-xl ${color}`}><Icon size={20} /></div>
    </div>;
}