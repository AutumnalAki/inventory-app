"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Filter, Eye, X, CheckCircle, 
  Clock, MapPin, User, Calendar, ChevronDown, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface RequisitionItem {
  name: string;
  quantity: number;
  unit: string;
  dateOut?: string;
  dateIn?: string;
}

interface Requisition {
  id: string;
  student_name: string;
  student_number: string;
  purpose: string;
  instructor: string;
  program_section: string;
  course_code: string;
  room: string;
  time_of_use: string;
  items: RequisitionItem[];
  signatures?: {
    requestedBy?: string;
    endorsedBy?: string;
    releasedBy?: string;
    approvedBy?: string;
  };
  status: "Reserved" | "Approved" | "Released" | "Completed" | "Cancelled";
  date_out: string;
  date_in: string | null;
  created_at: string;
}

export default function RequisitionTrackingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("Newest");
  
  // Dropdown states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("requisitions")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setRequisitions(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching requisitions:", err);
      setError(err.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  const processedRequisitions = useMemo(() => {
    let filtered = [...requisitions];

    // Apply status filter
    if (filterStatus !== "All") {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.student_number.toLowerCase().includes(query) ||
        req.student_name.toLowerCase().includes(query) ||
        req.room.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortOption === "Newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === "Room") {
      filtered.sort((a, b) => a.room.localeCompare(b.room));
    } else if (sortOption === "Status") {
      filtered.sort((a, b) => a.status.localeCompare(b.status));
    }

    return filtered;
  }, [requisitions, filterStatus, searchQuery, sortOption]);

  const statusCounts = useMemo(() => {
    const counts = {
      Reserved: 0,
      Approved: 0,
      Released: 0,
      Completed: 0,
      Cancelled: 0
    };
    requisitions.forEach(req => {
      counts[req.status as keyof typeof counts]++;
    });
    return counts;
  }, [requisitions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Approved":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Released":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "Completed":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "Cancelled":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getItemsDisplay = (items: RequisitionItem[]) => {
    const validItems = items.filter((i) => i.name && i.quantity > 0);
    return validItems.length > 0
      ? `${validItems.length} item${validItems.length > 1 ? "s" : ""}`
      : "No items";
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Requisition Tracking</h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">Monitor equipment requisition requests and status.</p>
        </div>
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="animate-spin mr-3">
            <Clock size={20} />
          </div>
          Loading requisitions...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col relative">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Requisition Tracking</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Monitor equipment requisition requests and status.</p>
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${getStatusColor(status).split(" ")[0]}`}>
              <CheckCircle size={16} className="md:w-5 md:h-5" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-white">{count}</div>
              <div className="text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">{status}</div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Controls Bar --- */}
      <div className="bg-white/5 border border-white/10 p-2 md:p-2.5 rounded-xl md:rounded-2xl backdrop-blur-xl flex flex-col gap-2 md:gap-4 relative z-20">
        
        {/* Top Row: Filters */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full">
          
          {/* Status Filter Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button 
              onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setSortDropdownOpen(false); }}
              className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              <Filter size={14} className="text-gray-500" />
              <span className="text-white text-xs font-medium">{filterStatus}</span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {statusDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] overflow-hidden"
                >
                  {["All", "Reserved", "Approved", "Released", "Completed", "Cancelled"].map((option) => (
                    <button
                      key={option}
                      onClick={() => { setFilterStatus(option); setStatusDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                        filterStatus === option 
                          ? 'bg-indigo-500/20 text-indigo-400' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {option}
                      {filterStatus === option && <CheckCircle size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort Option Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button 
              onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setStatusDropdownOpen(false); }}
              className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              <Calendar size={14} className="text-gray-500" />
              <span className="text-white text-xs font-medium">{sortOption}</span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {sortDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] overflow-hidden"
                >
                  {["Newest", "Room", "Status"].map((option) => (
                    <button
                      key={option}
                      onClick={() => { setSortOption(option); setSortDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                        sortOption === option 
                          ? 'bg-indigo-500/20 text-indigo-400' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {option}
                      {sortOption === option && <CheckCircle size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Bottom Row: Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Student ID, Name, or Room..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* --- Main Table --- */}
      <div className="hidden md:flex bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                <th className="p-4 w-[15%]">Student Number</th>
                <th className="p-4 w-[15%]">Items</th>
                <th className="p-4 w-[12%]">Room</th>
                <th className="p-4 w-[12%]">Instructor</th>
                <th className="p-4 w-[12%]">Date Borrowed</th>
                <th className="p-4 w-[12%]">Date Returned</th>
                <th className="p-4 w-[10%]">Status</th>
                <th className="p-4 text-right w-[6%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {processedRequisitions.length > 0 ? (
                processedRequisitions.map((req) => (
                  <tr key={req.id} className="group hover:bg-white/[0.07] transition-colors">
                    
                    {/* Student Number */}
                    <td className="p-4">
                      <div className="font-bold text-emerald-400 text-sm tabular-nums tracking-wide">{req.student_number}</div>
                      <div className="text-gray-500 mt-1 font-medium">{req.student_name}</div>
                    </td>

                    {/* Items */}
                    <td className="p-4">
                      <div className="font-bold text-gray-200 text-sm">{getItemsDisplay(req.items)}</div>
                    </td>

                    {/* Room */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <MapPin size={12} className="text-indigo-400" />
                        {req.room}
                      </div>
                    </td>

                    {/* Instructor */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <User size={12} className="text-indigo-400" />
                        {req.instructor}
                      </div>
                    </td>

                    {/* Date Borrowed */}
                    <td className="p-4 text-gray-300 font-medium">{formatDate(req.date_out)}</td>

                    {/* Date Returned */}
                    <td className="p-4 text-gray-400">{formatDate(req.date_in)}</td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedRequisition(req)}
                        className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-indigo-900/20"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No requisitions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal for Full Form --- */}
      <AnimatePresence>
        {selectedRequisition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 text-white px-6 py-4 flex justify-between items-center border-b">
                <h2 className="text-xl font-bold">Requisition Form - {selectedRequisition.id}</h2>
                <button
                  onClick={() => setSelectedRequisition(null)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6">
                {/* Paper Form */}
                <div className="bg-white rounded-lg border-4 border-black p-6">
                  {/* Header */}
                  <div className="border-b-4 border-black pb-4 mb-4 flex justify-between items-start">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col">
                        <h1 className="text-xl font-bold uppercase tracking-tight text-black">Colegio de Muntinlupa</h1>
                        <h2 className="text-2xl font-black uppercase text-black">Requisition Form</h2>
                        <p className="text-xs font-bold uppercase text-black">Equipment, Supplies and Apparatus</p>
                      </div>
                    </div>
                    {/* Document Code */}
                    <div className="border-2 border-black text-xs w-48">
                      <div className="bg-black text-white p-1 font-bold text-center border-b-2 border-black uppercase">Document Code</div>
                      <div className="grid grid-cols-3 text-xs font-bold text-black">
                        <div className="border-r-2 border-b-2 border-black p-1 text-center"><span className="text-[9px] text-black">Effective Date</span></div>
                        <div className="border-r-2 border-b-2 border-black p-1 text-center"><span className="text-[9px] text-black">Revision No.</span><div className="text-black">00</div></div>
                        <div className="border-b-2 border-black p-1 text-center"><span className="text-[9px] text-black">Revision Date</span></div>
                      </div>
                      <div className="border-t-2 border-black p-1 text-center bg-yellow-50 text-xs font-mono font-bold text-black">AUTOGEN-DLI-SUBMIT</div>
                    </div>
                  </div>

                  {/* Form Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4 border-b-4 border-black pb-4">
                    <div>
                      <p className="font-bold text-black text-xs">Name:</p>
                      <p className="text-black text-sm">{selectedRequisition.student_name}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Program & Section:</p>
                      <p className="text-black text-sm">{selectedRequisition.program_section}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Student No.:</p>
                      <p className="text-black text-sm">{selectedRequisition.student_number}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Course/Code:</p>
                      <p className="text-black text-sm">{selectedRequisition.course_code}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Purpose:</p>
                      <p className="text-black text-sm">{selectedRequisition.purpose}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Room:</p>
                      <p className="text-black text-sm">{selectedRequisition.room}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Instructor:</p>
                      <p className="text-black text-sm">{selectedRequisition.instructor}</p>
                    </div>
                    <div>
                      <p className="font-bold text-black text-xs">Time of use:</p>
                      <p className="text-black text-sm">{selectedRequisition.time_of_use || "—"}</p>
                    </div>
                  </div>

                  {/* Equipment Table */}
                  <div className="mb-4 border-b-4 border-black pb-4">
                    <p className="font-bold text-black text-xs mb-2">EQUIPMENT ITEMS</p>
                    <table className="w-full text-black border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-200 border-b-2 border-black">
                          <th className="border-r-2 border-black p-2 text-left">Equipment</th>
                          <th className="border-r-2 border-black p-2 text-center w-16">Qty</th>
                          <th className="border-r-2 border-black p-2 text-center w-14">Unit</th>
                          <th className="border-r-2 border-black p-2 text-center">Date Out</th>
                          <th className="p-2 text-center">Date In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequisition.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-black">
                            <td className="border-r-2 border-black p-2">{item.name || "—"}</td>
                            <td className="border-r-2 border-black p-2 text-center">{item.quantity || "—"}</td>
                            <td className="border-r-2 border-black p-2 text-center">{item.unit || "—"}</td>
                            <td className="border-r-2 border-black p-2 text-center text-[9px]">
                              {item.dateOut ? new Date(item.dateOut).toLocaleDateString("en-US") : "—"}
                            </td>
                            <td className="p-2 text-center text-[9px]">
                              {item.dateIn ? new Date(item.dateIn).toLocaleDateString("en-US") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Status & Signatures */}
                  <div className="border-t-4 border-black pt-4">
                    <p className="font-bold text-black text-xs mb-2">STATUS</p>
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold border mb-4 ${getStatusColor(selectedRequisition.status)}`}>
                      {selectedRequisition.status}
                    </span>
                    
                    {selectedRequisition.signatures && (
                      <div className="mt-4">
                        <p className="font-bold text-black text-xs mb-2">SIGNATURES</p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {selectedRequisition.signatures.requestedBy && (
                            <div>
                              <p className="font-bold text-black">Requested by:</p>
                              <p className="text-black">{selectedRequisition.signatures.requestedBy}</p>
                            </div>
                          )}
                          {selectedRequisition.signatures.endorsedBy && (
                            <div>
                              <p className="font-bold text-black">Endorsed by:</p>
                              <p className="text-black">{selectedRequisition.signatures.endorsedBy}</p>
                            </div>
                          )}
                          {selectedRequisition.signatures.releasedBy && (
                            <div>
                              <p className="font-bold text-black">Released by:</p>
                              <p className="text-black">{selectedRequisition.signatures.releasedBy}</p>
                            </div>
                          )}
                          {selectedRequisition.signatures.approvedBy && (
                            <div>
                              <p className="font-bold text-black">Approved by:</p>
                              <p className="text-black">{selectedRequisition.signatures.approvedBy}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-100 px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setSelectedRequisition(null)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// --- Helper Component ---

function StatusBadge({ status }: { status: string }) {
  if (status === "Borrowed") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        Borrowed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
      Returned
    </span>
  );
}