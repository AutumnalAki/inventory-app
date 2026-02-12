"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Download, Box, FileText, AlertTriangle, TrendingUp, AlertOctagon, ChevronDown, Lock, CheckCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInventory } from "@/context/InventoryContext";
import { useRole } from "@/context/RoleContext";

// --- EXPORT LIBRARIES ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Role to Lab Mapping - maps role names to their database location names
const ROLE_LAB_DB_MAPPING: Record<string, string> = {
  "ME Lab": "Mechanical Engineering Laboratory",
  "CE Lab": "Civil Engineering Laboratory",
  "ECE Lab": "ECE Laboratory",
  "CPE Lab": "Computer Laboratory",
  "CHEM Lab": "Chemistry Laboratory",
  "PHYS Lab": "Physics Laboratory",
  "EE Lab": "Electrical Engineering Laboratory"
  ,
  "Central Storage Room": "Central Storage Room"
};

// Roles with full access to all labs
const FULL_ACCESS_ROLES = ["Developer", "SuperAdmin", "Administrator", "Program Chair", "Faculty"];

export default function ReportsPage() {
  const { inventory, loans } = useInventory();
  const { role } = useRole();
  const [hoveredSegment, setHoveredSegment] = useState<any>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if user has restricted lab access
  const isLabRestricted = !FULL_ACCESS_ROLES.includes(role) && ROLE_LAB_DB_MAPPING[role];
  const userLabDbName = isLabRestricted ? ROLE_LAB_DB_MAPPING[role] : null;

  // Filter inventory based on role
  const filteredInventory = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return inventory.filter(item => item.location === userLabDbName);
    }
    return inventory;
  }, [inventory, isLabRestricted, userLabDbName]);

  // Filter loans based on role
  const filteredLoans = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return loans.filter(loan => loan.location === userLabDbName);
    }
    return loans;
  }, [loans, isLabRestricted, userLabDbName]);

  // --- STATS LOGIC (now using filtered data) ---
  const totalItems = filteredInventory.reduce((acc, i) => acc + i.quantity, 0);
  const brokenItems = filteredInventory.filter(i => i.condition === "Broken");
  const inUseItems = filteredLoans.filter(l => l.status === "Borrowed").reduce((acc, l) => acc + l.qty, 0);
  const availableItems = totalItems - inUseItems - brokenItems.length;

  // --- CHARTS DATA ---
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
     filteredInventory.forEach(item => { counts[item.location] = (counts[item.location] || 0) + item.quantity; });
     return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [filteredInventory]);

  // --- EXPORT HANDLERS ---

  const exportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(18);
    doc.text("Inventory Status Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${date}`, 14, 28);

    // 1. Executive Summary
    doc.setFontSize(14);
    doc.text("1. Executive Summary", 14, 40);
    
    const summaryData = [
      ["Total Items", totalItems],
      ["Available", availableItems],
      ["In Use (Borrowed)", inUseItems],
      ["Broken / Damaged", brokenItems.length],
    ];

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Count']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] } // Indigo
    });

    // 2. Inventory by Location (ADDED THIS SECTION)
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("2. Inventory by Location", 14, finalY);

    const locationRows = locationCounts.map(l => [l.label, l.count]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Location', 'Total Items']],
      body: locationRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // Emerald
    });

    // 3. Broken Items Report
    finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page for the next table
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.text("3. Broken Items Report", 14, finalY);

    const brokenRows = brokenItems.map(item => [item.name, item.controlId, item.location, item.remarks]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Item Name', 'Control ID', 'Location', 'Remarks']],
      body: brokenRows,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] } // Red
    });

    doc.save(`Inventory_Report_${date}.pdf`);
    setIsExportOpen(false);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      { Metric: "Total Items", Count: totalItems },
      { Metric: "Available", Count: availableItems },
      { Metric: "In Use", Count: inUseItems },
      { Metric: "Broken", Count: brokenItems.length },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2: Locations (Ensured this is included)
    const locData = locationCounts.map(l => ({ Location: l.label, Total_Items: l.count }));
    const wsLoc = XLSX.utils.json_to_sheet(locData);
    XLSX.utils.book_append_sheet(wb, wsLoc, "Locations");

    // Sheet 3: Broken Items
    const brokenData = brokenItems.map(i => ({
        Name: i.name, ControlID: i.controlId, Location: i.location, Remarks: i.remarks
    }));
    const wsBroken = XLSX.utils.json_to_sheet(brokenData);
    XLSX.utils.book_append_sheet(wb, wsBroken, "Broken Items");

    XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportOpen(false);
  };

  const exportCSV = () => {
    // CSV is flat, so we export the "Locations" summary as that's useful data
    const headers = ["Location,Total Items"];
    const rows = locationCounts.map(l => `"${l.label}",${l.count}`);
    const csvContent = [headers, ...rows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Location_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setIsExportOpen(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
            {isLabRestricted && userLabDbName && (
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                <Lock size={12} />
                <span>Viewing reports for {userLabDbName}</span>
              </div>
            )}
          </div>
          
          {/* EXPORT DROPDOWN */}
          <div className="relative w-full sm:w-auto" ref={exportDropdownRef}>
            <button 
                onClick={() => setIsExportOpen(!isExportOpen)} 
                className="flex items-center justify-center gap-2 bg-white/5 hover:border-white/20 border border-white/10 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all w-full sm:w-auto"
            >
                <Download size={16} /> Export Report <ChevronDown size={14} className={`text-gray-500 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isExportOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <button onClick={() => { exportPDF(); setIsExportOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                          <FileText size={14} /> Export as PDF
                        </button>
                        <button onClick={() => { exportExcel(); setIsExportOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                          <Box size={14} /> Export as Excel
                        </button>
                        <button onClick={() => { exportCSV(); setIsExportOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                          <Download size={14} /> Export CSV (Locations)
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
      </div>
      
      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <StatCard title="Total Items" value={totalItems} icon={Box} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard title="Available" value={availableItems} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard title="In Use" value={inUseItems} icon={FileText} color="bg-blue-500/10 text-blue-400" />
          <StatCard title="Broken" value={brokenItems.length} icon={AlertOctagon} color="bg-red-500/10 text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Donut Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center relative min-h-[280px] md:min-h-[320px]">
            <h3 className="absolute top-4 md:top-6 left-4 md:left-6 text-sm md:text-lg font-bold">Item Condition</h3>
            <div className="relative w-40 h-40 md:w-56 md:h-56 mt-4 md:mt-6">
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
                   <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{hoveredSegment ? hoveredSegment.value : totalItems}</p>
                   <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500">{hoveredSegment ? hoveredSegment.label : "Total"}</p>
                </div>
            </div>
        </div>

        {/* Location Bars */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 min-h-[280px] md:min-h-[320px]">
             <h3 className="text-sm md:text-lg font-bold mb-4 md:mb-6">Inventory by Location</h3>
             <div className="space-y-4 md:space-y-6">
                {locationCounts.map(l => (
                    <div key={l.label}>
                        <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-300">{l.label}</span><span className="text-gray-500">{l.count}</span></div>
                        <div className="w-full bg-white/5 rounded-full h-2"><div style={{ width: `${(l.count / (totalItems || 1)) * 100}%` }} className="h-full rounded-full bg-indigo-500" /></div>
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Broken Items Table - Desktop */}
      <div className="hidden md:grid grid-cols-1 gap-6">
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

      {/* Broken Items - Mobile Cards */}
      <div className="md:hidden">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-white/10 flex justify-between items-center bg-red-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="font-bold text-white text-sm">Broken Items</h3>
            </div>
            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {brokenItems.length}
            </span>
          </div>
          <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
            {brokenItems.map(item => (
              <div key={item.id} className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-white text-sm">{item.name}</p>
                  <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{item.controlId}</span>
                </div>
                {item.remarks && <p className="text-red-400 text-xs mt-1">{item.remarks}</p>}
              </div>
            ))}
            {brokenItems.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">No broken items. Good job!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
    return <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase truncate">{title}</p><h3 className="text-xl md:text-2xl font-bold text-white">{value}</h3></div>
        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl shrink-0 ${color}`}><Icon size={16} className="md:w-5 md:h-5" /></div>
    </div>;
}