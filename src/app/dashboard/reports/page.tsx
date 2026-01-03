"use client";

import React, { useState, useMemo } from "react";
import { 
  Download, Calendar, Box, Activity, FileText, 
  AlertTriangle, CheckCircle, TrendingUp, AlertOctagon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Mock Data ---
const BROKEN_ITEMS = [
  { id: 1, name: "Vex V5 Brain", controlId: "Brain-001", category: "Electronics", status: "Broken", date: "1/3/2026" },
  { id: 2, name: "11W Vex V5 Motor", controlId: "Motor-001", category: "Motors", status: "Broken", date: "1/3/2026" },
  { id: 3, name: "Optical Sensor", controlId: "Sens-042", category: "Sensors", status: "Broken", date: "12/28/2025" },
];

const ACTIVITY_LOGS = [
  { id: 1, action: "marked item as broken", item: "Vex V5 Brain", time: "2025-12-01 08:34:56" },
  { id: 2, action: "marked item as broken", item: "11W Vex V5 Motor", time: "2025-12-01 08:34:10" },
  { id: 3, action: "marked item as broken", item: "Aluminum C-Channel", time: "2025-11-24 17:20:44" },
  { id: 4, action: "restocked item", item: "Smart Cables (20x)", time: "2025-11-24 14:30:00" },
  { id: 5, action: "marked item as broken", item: "Aluminum C-Channel", time: "2025-11-24 10:15:22" },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("This Month");
  
  // --- CHART INTERACTION STATE ---
  const [hoveredSegment, setHoveredSegment] = useState<any>(null);

  // Chart Data Configuration
  const chartData = useMemo(() => {
    const total = 1258;
    const data = [
      { id: "available", label: "Available", value: 854, color: "#10b981" },
      { id: "used", label: "In Use", value: 390, color: "#3b82f6" },
      { id: "broken", label: "Broken", value: 14, color: "#ef4444" },
    ];

    let currentOffset = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    return data.map(item => {
      const percentage = item.value / total;
      const strokeLength = circumference * percentage;
      const strokeDasharray = `${strokeLength} ${circumference}`;
      const strokeDashoffset = -currentOffset;
      
      currentOffset += strokeLength;

      return { ...item, strokeDasharray, strokeDashoffset };
    });
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Reports</h1>
          <p className="text-gray-400 mt-1">Detailed breakdown of inventory status and health.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative">
                 <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer"
                 >
                    <option className="bg-gray-900">This Month</option>
                    <option className="bg-gray-900">Last Month</option>
                    <option className="bg-gray-900">This Year</option>
                 </select>
                 <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
            
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download size={16} />
                Export CSV
            </button>
        </div>
      </div>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Items" value="1,258" icon={<Box size={20} />} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard title="Available" value="854" icon={<TrendingUp size={20} />} color="bg-emerald-500/10 text-emerald-400" trend="+12%" />
          <StatCard title="In Use" value="390" icon={<FileText size={20} />} color="bg-blue-500/10 text-blue-400" />
          <StatCard title="Broken" value="14" icon={<AlertOctagon size={20} />} color="bg-red-500/10 text-red-400" alert />
      </div>

      {/* --- Charts Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Item Condition Status (Interactive Donut Chart) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative backdrop-blur-sm min-h-[320px]">
            <h3 className="absolute top-6 left-6 text-lg font-bold">Item Condition Status</h3>
            
            <div className="relative w-56 h-56 mt-6">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="12" fill="none" className="opacity-30" />
                    {chartData.map((segment) => (
                      <motion.circle
                        key={segment.id}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="12"
                        strokeDasharray={segment.strokeDasharray}
                        strokeDashoffset={segment.strokeDashoffset}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: segment.strokeDasharray }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        onMouseEnter={() => setHoveredSegment(segment)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        className="cursor-pointer transition-all duration-300 hover:opacity-100 opacity-90 hover:stroke-[14px]"
                      />
                    ))}
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <AnimatePresence mode="wait">
                      {hoveredSegment ? (
                        <motion.div 
                          key="hover"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="text-center"
                        >
                          <p className="text-3xl font-bold text-white tabular-nums">{hoveredSegment.value}</p>
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: hoveredSegment.color }}>
                            {hoveredSegment.label}
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center"
                        >
                           <p className="text-3xl font-bold text-white">1,258</p>
                           <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Total Items</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 mt-8 w-full px-8">
                {chartData.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /> 
                    {item.label}
                  </div>
                ))}
            </div>
        </div>

        {/* 2. Inventory by Location (UPDATED) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm min-h-[320px]">
             <h3 className="text-lg font-bold mb-6">Inventory by Location</h3>
             <div className="space-y-6">
                <CategoryBar label="Computer Laboratory" value={35} color="bg-indigo-500" count="450" />
                <CategoryBar label="Physics Laboratory" value={24} color="bg-purple-500" count="302" />
                <CategoryBar label="Robotics Lab" value={20} color="bg-blue-500" count="256" />
                <CategoryBar label="Chemistry Laboratory" value={12} color="bg-emerald-500" count="152" />
                <CategoryBar label="ECE Laboratory" value={9} color="bg-orange-500" count="98" />
             </div>
        </div>
      </div>

      {/* --- Broken Items Report & Logs --- */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-red-500/5">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-400" />
                    <h3 className="font-bold text-white">Damaged / Broken Items Report</h3>
                </div>
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full">
                    {BROKEN_ITEMS.length} Items
                </span>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-gray-500 border-b border-white/10 text-[10px] uppercase tracking-wider">
                        <th className="p-4 font-semibold">Item Name</th>
                        <th className="p-4 font-semibold">Control ID</th>
                        <th className="p-4 font-semibold">Category</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Last Checked</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {BROKEN_ITEMS.map(item => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-medium text-white">{item.name}</td>
                            <td className="p-4 text-gray-400 font-mono text-xs">{item.controlId}</td>
                            <td className="p-4 text-gray-300">{item.category}</td>
                            <td className="p-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                                    <AlertOctagon size={10} /> {item.status}
                                </span>
                            </td>
                            <td className="p-4 text-gray-500">{item.date}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
             <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
             <div className="space-y-0">
                {ACTIVITY_LOGS.map((log, index) => (
                    <div key={log.id} className="relative pl-6 pb-6 last:pb-0 border-l border-white/10">
                        <div className={`absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full ${index === 0 ? "bg-blue-500 animate-pulse" : "bg-gray-600"}`} />
                        <p className="text-sm text-gray-200">
                             <span className="text-gray-400 mr-1">User</span> 
                             {log.action} 
                             <span className="text-white font-medium ml-1">: {log.item}</span>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">{log.time}</p>
                    </div>
                ))}
             </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ title, value, icon, color, trend, alert }: any) {
    return (
        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between ${alert ? "bg-red-900/10 border-red-500/20" : "bg-white/5 border-white/10"}`}>
            <div>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{title}</p>
                 <h3 className={`text-2xl font-bold ${alert ? "text-red-400" : "text-white"}`}>{value}</h3>
                 {trend && <p className="text-[10px] text-emerald-400 mt-1">{trend}</p>}
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
                {icon}
            </div>
        </div>
    );
}

function CategoryBar({ label, value, color, count }: any) {
    return (
        <div>
            <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300 font-medium">{label}</span>
                <span className="text-gray-500 tabular-nums">{count} items</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${color}`}
                />
            </div>
        </div>
    )
}