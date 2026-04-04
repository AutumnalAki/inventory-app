"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Filter, Eye, X, CheckCircle,
  Clock, MapPin, User, Calendar, ChevronDown, XCircle, Trash2, RotateCcw, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import RequisitionFormTestingPage from "../requisition-form-testing/page";
import { downloadRequisitionPdf, type RequisitionPdfData } from "@/lib/requisitionPdf";

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
    signatureDates?: {
      requestedBy?: string;
      endorsedBy?: string;
      releasedBy?: string;
      approvedBy?: string;
    };
    documentCode?: {
      effectiveDate?: string;
      revisionNo?: string;
      revisionDate?: string;
    };
  };
  status: "Reserved" | "Approved" | "Released" | "Completed" | "Cancelled";
  requisition_type?: "borrow" | "reservation" | string;
  date_out: string;
  date_in: string | null;
  created_at: string;
}

type InventoryRow = {
  id: number;
  item_name: string;
  quantity: number;
  low_stock_threshold: number | null;
};

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function RequisitionTrackingPage() {
  const [activeRecordType, setActiveRecordType] = useState<"borrow" | "reservation">("borrow");
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("Newest");
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, boolean>>({});
  
  // Dropdown states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  useEffect(() => {
    setSelectedRequisition(null);
  }, [activeRecordType]);

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
    let filtered = requisitions.filter(
      (req) => (req.requisition_type || "reservation").toLowerCase() === activeRecordType
    );

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
        req.room.toLowerCase().includes(query) ||
        req.purpose.toLowerCase().includes(query)
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
  }, [requisitions, filterStatus, searchQuery, sortOption, activeRecordType]);

  const statusCounts = useMemo(() => {
    const counts = {
      Reserved: 0,
      Approved: 0,
      Released: 0,
      Completed: 0,
      Cancelled: 0
    };
    requisitions
      .filter((req) => (req.requisition_type || "reservation").toLowerCase() === activeRecordType)
      .forEach(req => {
      counts[req.status as keyof typeof counts]++;
    });
    return counts;
  }, [requisitions, activeRecordType]);

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

  const selectedFormData = useMemo(() => {
    if (!selectedRequisition) return null;

    return {
      form: {
        studentName: selectedRequisition.student_name || "",
        studentNumber: selectedRequisition.student_number || "",
        purpose: selectedRequisition.purpose || "",
        instructor: selectedRequisition.instructor || "",
        programSection: selectedRequisition.program_section || "",
        courseCode: selectedRequisition.course_code || "",
        room: selectedRequisition.room || "",
        timeOfUse: selectedRequisition.time_of_use || "",
        items: (selectedRequisition.items || []).map((item) => ({
          name: item.name || "",
          quantity: Number(item.quantity) || 0,
          unit: item.unit || "",
          dateOut: toDateTimeLocal(item.dateOut || selectedRequisition.date_out),
          dateIn: toDateTimeLocal(item.dateIn || selectedRequisition.date_in),
        })),
      },
      signatures: {
        requestedBy: selectedRequisition.signatures?.requestedBy || "",
        endorsedBy: selectedRequisition.signatures?.endorsedBy || "",
        releasedBy: selectedRequisition.signatures?.releasedBy || "",
        approvedBy: selectedRequisition.signatures?.approvedBy || "",
      },
      signatureDates: {
        requestedBy: selectedRequisition.signatures?.signatureDates?.requestedBy || "",
        endorsedBy: selectedRequisition.signatures?.signatureDates?.endorsedBy || "",
        releasedBy: selectedRequisition.signatures?.signatureDates?.releasedBy || "",
        approvedBy: selectedRequisition.signatures?.signatureDates?.approvedBy || "",
      },
      documentCode: {
        effectiveDate: selectedRequisition.signatures?.documentCode?.effectiveDate || "",
        revisionNo: selectedRequisition.signatures?.documentCode?.revisionNo || "",
        revisionDate: selectedRequisition.signatures?.documentCode?.revisionDate || "",
      },
    };
  }, [selectedRequisition]);

  const setRowLoading = (id: string, loading: boolean) => {
    setActionLoadingById((prev) => ({ ...prev, [id]: loading }));
  };

  const updateRequisitionLocally = (id: string, updates: Partial<Requisition>) => {
    setRequisitions((prev) => prev.map((req) => (req.id === id ? { ...req, ...updates } : req)));
    setSelectedRequisition((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
  };

  const calculateStockStatus = (quantity: number, lowStockThreshold: number | null) => {
    const threshold = lowStockThreshold ?? 5;
    if (quantity <= 0) return "Out of Stock";
    if (quantity <= threshold) return "Low Stock";
    return "In Stock";
  };

  const deductBorrowedItemsFromInventory = async (req: Requisition) => {
    const itemDeductions = new Map<string, number>();

    (req.items || []).forEach((item) => {
      const name = item.name?.trim();
      const qty = Number(item.quantity) || 0;
      if (!name || qty <= 0) return;
      itemDeductions.set(name, (itemDeductions.get(name) || 0) + qty);
    });

    for (const [itemName, neededQty] of itemDeductions.entries()) {
      const { data: inventoryRows, error: fetchError } = await supabase
        .from("inventory")
        .select("id, item_name, quantity, low_stock_threshold")
        .eq("item_name", itemName)
        .order("quantity", { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to load inventory for ${itemName}.`);
      }

      const rows = (inventoryRows || []) as InventoryRow[];
      if (rows.length === 0) {
        throw new Error(`Item \"${itemName}\" was not found in inventory.`);
      }

      const totalAvailable = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      if (totalAvailable < neededQty) {
        throw new Error(`Not enough stock for \"${itemName}\" (needed ${neededQty}, available ${totalAvailable}).`);
      }

      let remaining = neededQty;

      for (const row of rows) {
        if (remaining <= 0) break;

        const currentQty = Number(row.quantity) || 0;
        if (currentQty <= 0) continue;

        const deductQty = Math.min(currentQty, remaining);
        const newQty = currentQty - deductQty;
        const newStock = calculateStockStatus(newQty, row.low_stock_threshold);

        const { error: updateError } = await supabase
          .from("inventory")
          .update({ quantity: newQty, stock_status: newStock })
          .eq("id", row.id);

        if (updateError) {
          throw new Error(`Failed to update inventory for \"${itemName}\".`);
        }

        remaining -= deductQty;
      }
    }
  };

  const restoreReturnedItemsToInventory = async (req: Requisition) => {
    const itemRestocks = new Map<string, number>();

    (req.items || []).forEach((item) => {
      const name = item.name?.trim();
      const qty = Number(item.quantity) || 0;
      if (!name || qty <= 0) return;
      itemRestocks.set(name, (itemRestocks.get(name) || 0) + qty);
    });

    for (const [itemName, returnedQty] of itemRestocks.entries()) {
      const { data: inventoryRows, error: fetchError } = await supabase
        .from("inventory")
        .select("id, item_name, quantity, low_stock_threshold")
        .eq("item_name", itemName)
        .order("quantity", { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to load inventory for ${itemName}.`);
      }

      const rows = (inventoryRows || []) as InventoryRow[];
      if (rows.length === 0) {
        throw new Error(`Item "${itemName}" was not found in inventory.`);
      }

      const targetRow = rows[0];
      const currentQty = Number(targetRow.quantity) || 0;
      const newQty = currentQty + returnedQty;
      const newStock = calculateStockStatus(newQty, targetRow.low_stock_threshold);

      const { error: updateError } = await supabase
        .from("inventory")
        .update({ quantity: newQty, stock_status: newStock })
        .eq("id", targetRow.id);

      if (updateError) {
        throw new Error(`Failed to restock inventory for "${itemName}".`);
      }
    }
  };

  const handleApprove = async (req: Requisition) => {
    const nowIso = new Date().toISOString();
    try {
      setRowLoading(req.id, true);

      const isBorrowRequest = (req.requisition_type || activeRecordType).toLowerCase() === "borrow";
      if (isBorrowRequest) {
        await deductBorrowedItemsFromInventory(req);
      }

      const { error: updateError } = await supabase
        .from("requisitions")
        .update({ status: "Approved", date_out: nowIso })
        .eq("id", req.id);

      if (updateError) throw updateError;

      updateRequisitionLocally(req.id, { status: "Approved", date_out: nowIso });
    } catch (err: any) {
      console.error("Error approving requisition:", err);
      alert("Failed to approve requisition");
    } finally {
      setRowLoading(req.id, false);
    }
  };

  const handleDecline = async (req: Requisition) => {
    try {
      setRowLoading(req.id, true);
      const { error: updateError } = await supabase
        .from("requisitions")
        .update({ status: "Cancelled" })
        .eq("id", req.id);

      if (updateError) throw updateError;

      updateRequisitionLocally(req.id, { status: "Cancelled" });
    } catch (err: any) {
      console.error("Error declining requisition:", err);
      alert("Failed to decline requisition");
    } finally {
      setRowLoading(req.id, false);
    }
  };

  const handleDelete = async (req: Requisition) => {
    const confirmed = window.confirm("Delete this requisition entry permanently?");
    if (!confirmed) return;

    try {
      setRowLoading(req.id, true);
      const { error: deleteError } = await supabase
        .from("requisitions")
        .delete()
        .eq("id", req.id);

      if (deleteError) throw deleteError;

      setRequisitions((prev) => prev.filter((item) => item.id !== req.id));
      setSelectedRequisition((prev) => (prev?.id === req.id ? null : prev));
    } catch (err: any) {
      console.error("Error deleting requisition:", err);
      alert("Failed to delete requisition");
    } finally {
      setRowLoading(req.id, false);
    }
  };

  const handleReturnBorrow = async (req: Requisition) => {
    const nowIso = new Date().toISOString();
    try {
      setRowLoading(req.id, true);

      await restoreReturnedItemsToInventory(req);

      const { error: updateError } = await supabase
        .from("requisitions")
        .update({ status: "Completed", date_in: nowIso })
        .eq("id", req.id);

      if (updateError) throw updateError;

      updateRequisitionLocally(req.id, { status: "Completed", date_in: nowIso });
    } catch (err: any) {
      console.error("Error returning borrow:", err);
      alert("Failed to mark borrow as returned");
    } finally {
      setRowLoading(req.id, false);
    }
  };

  const handleDownloadViewedPdf = async () => {
    if (!selectedRequisition) return;

    const payload: RequisitionPdfData = {
      id: selectedRequisition.id,
      logoSrc: "/favicon.ico",
      studentName: selectedRequisition.student_name || "",
      studentNumber: selectedRequisition.student_number || "",
      purpose: selectedRequisition.purpose || "",
      instructor: selectedRequisition.instructor || "",
      programSection: selectedRequisition.program_section || "",
      courseCode: selectedRequisition.course_code || "",
      room: selectedRequisition.room || "",
      timeOfUse: selectedRequisition.time_of_use || "",
      items: (selectedRequisition.items || []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity) || 0,
        unit: item.unit,
      })),
      signatures: {
        requestedBy: selectedRequisition.signatures?.requestedBy || "",
        endorsedBy: selectedRequisition.signatures?.endorsedBy || "",
        releasedBy: selectedRequisition.signatures?.releasedBy || "",
        approvedBy: selectedRequisition.signatures?.approvedBy || "",
        signatureDates: {
          requestedBy: selectedRequisition.signatures?.signatureDates?.requestedBy || "",
          endorsedBy: selectedRequisition.signatures?.signatureDates?.endorsedBy || "",
          releasedBy: selectedRequisition.signatures?.signatureDates?.releasedBy || "",
          approvedBy: selectedRequisition.signatures?.signatureDates?.approvedBy || "",
        },
        documentCode: {
          effectiveDate: selectedRequisition.signatures?.documentCode?.effectiveDate || "",
          revisionNo: selectedRequisition.signatures?.documentCode?.revisionNo || "",
          revisionDate: selectedRequisition.signatures?.documentCode?.revisionDate || "",
        },
      },
      status: selectedRequisition.status,
      requisitionType: (selectedRequisition.requisition_type || activeRecordType) as string,
      dateOut: selectedRequisition.date_out,
      dateIn: selectedRequisition.date_in,
      createdAt: selectedRequisition.created_at,
    };

    try {
      await downloadRequisitionPdf(payload, `Requisition-${selectedRequisition.id}.pdf`);
    } catch (error) {
      console.error("Tracking PDF export failed:", error);
      alert("Failed to generate PDF.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tracking</h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">Monitor borrow and reservation requisitions in one place.</p>
        </div>
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="animate-spin mr-3">
            <Clock size={20} />
          </div>
          Loading tracking records...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col relative">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tracking</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Monitor borrow and reservation requisitions in one place.</p>
      </div>

      {/* Record Type Tabs */}
      <div className="inline-flex w-fit rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setActiveRecordType("borrow")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeRecordType === "borrow"
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:bg-white/10"
          }`}
        >
          Borrows
        </button>
        <button
          onClick={() => setActiveRecordType("reservation")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeRecordType === "reservation"
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:bg-white/10"
          }`}
        >
          Reservations
        </button>
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
                <th className="p-4 w-[12%]">{activeRecordType === "borrow" ? "Date Borrowed" : "Date Reserved"}</th>
                <th className="p-4 w-[12%]">{activeRecordType === "borrow" ? "Date Returned" : "Date Completed"}</th>
                <th className="p-4 w-[10%]">Status</th>
                <th className="p-4 text-right w-[12%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {processedRequisitions.length > 0 ? (
                processedRequisitions.map((req) => (
                  <tr key={req.id} className="group hover:bg-white/[0.07] transition-colors">
                    {(() => {
                      const isRowBusy = Boolean(actionLoadingById[req.id]);
                      const canApprove = !["Approved", "Completed", "Cancelled"].includes(req.status);
                      const canDecline = !["Completed", "Cancelled"].includes(req.status);
                      return (
                        <>
                    
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
                      <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={!canApprove || isRowBusy}
                          title="Approve"
                          aria-label="Approve"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle size={13} />
                        </button>
                        <button
                          onClick={() => handleDecline(req)}
                          disabled={!canDecline || isRowBusy}
                          title="Decline"
                          aria-label="Decline"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <XCircle size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(req)}
                          disabled={isRowBusy}
                          title="Delete"
                          aria-label="Delete"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                        {activeRecordType === "borrow" && req.status === "Approved" && (
                          <button
                            onClick={() => handleReturnBorrow(req)}
                            disabled={isRowBusy}
                            title="Returned"
                            aria-label="Returned"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRequisition(req)}
                          title="View"
                          aria-label="View"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition-colors hover:bg-white/10"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No {activeRecordType} requisitions found
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
              className="bg-gray-950 border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white px-6 py-4 flex justify-between items-center border-b border-white/10">
                <h2 className="text-xl font-bold">
                  {activeRecordType === "borrow" ? "Borrow" : "Reservation"} Form - {selectedRequisition.id}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      void handleDownloadViewedPdf();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition-colors"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setSelectedRequisition(null)}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-4">
                <div>
                  {selectedFormData && (
                    <RequisitionFormTestingPage
                      initialData={selectedFormData.form}
                      initialSignatures={selectedFormData.signatures}
                      initialDocumentCode={selectedFormData.documentCode}
                      initialSignatureDates={selectedFormData.signatureDates}
                      readOnly
                      hideToolbar
                      hideSubmitButtons
                      embedded
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}