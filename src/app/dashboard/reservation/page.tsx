"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  CalendarClock, Plus, Search, Filter, ChevronDown, CheckCircle, XCircle,
  Clock, Package, X, Save, ArrowUpDown, Trash2, AlertCircle, RotateCcw, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInventory, Reservation } from "@/context/InventoryContext";
import { usePopup } from "@/context/PopupContext";
import { useRole } from "@/context/RoleContext";
import { supabase } from "@/lib/supabase";

// Roles that can approve / reject reservations
const APPROVER_ROLES = ["Developer", "Administrator", "Program Chair", "Faculty"];

// Lab mapping (mirrors inventory page)
const LAB_MAPPING: Record<string, string> = {
  "All Labs": "All",
  "Computer Lab": "Computer Laboratory",
  "CE Lab": "Civil Engineering Laboratory",
  "Chem Lab": "Chemistry Laboratory",
  "Physics Lab": "Physics Laboratory",
  "EE Lab": "Electrical Engineering Laboratory",
  "ME Lab": "Mechanical Engineering Laboratory",
  "ECE Lab": "ECE Laboratory",
  "CPE Lab": "CPE Laboratory",
  "CSR (Central Storage Room)": "Central Storage Room"
};

const ROLE_LAB_MAPPING: Record<string, string> = {
  "ME Lab": "Mechanical Engineering Laboratory",
  "CE Lab": "Civil Engineering Laboratory",
  "ECE Lab": "ECE Laboratory",
  "CPE Lab": "Computer Laboratory",
  "CHEM Lab": "Chemistry Laboratory",
  "PHYS Lab": "Physics Laboratory",
  "EE Lab": "Electrical Engineering Laboratory",
  "Central Storage Room": "Central Storage Room"
};
const FULL_ACCESS_ROLES = ["Developer", "Administrator", "Program Chair", "Faculty"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  approved: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
  completed: <Package size={14} />,
  cancelled: <AlertCircle size={14} />,
};

export default function ReservationPage() {
  const { inventory, reservations, addReservation, updateReservationStatus, cancelReservation, deleteReservation } = useInventory();
  const { role } = useRole();
  const { showConfirm } = usePopup();

  const isApprover = APPROVER_ROLES.includes(role);
  const isLabRestricted = !FULL_ACCESS_ROLES.includes(role) && ROLE_LAB_MAPPING[role];
  const userLabDbName = isLabRestricted ? ROLE_LAB_MAPPING[role] : null;

  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOption, setSortOption] = useState("Newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Dropdown states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [form, setForm] = useState({
    quantity: 1,
    purpose: "",
    neededDate: "",
    returnDate: "",
    notes: "",
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setStatusDropdownOpen(false);
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) setSortDropdownOpen(false);
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) setItemDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered inventory for the item picker (only available items)
  const availableItems = useMemo(() => {
    let items = inventory.filter(i => i.condition === "Available" && i.quantity > 0);
    if (isLabRestricted && userLabDbName) {
      items = items.filter(i => i.location === userLabDbName);
    }
    if (itemSearch) {
      const term = itemSearch.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(term) || i.controlId.toLowerCase().includes(term));
    }
    return items;
  }, [inventory, itemSearch, isLabRestricted, userLabDbName]);

  // --- PROCESSED DATA ---
  const processedData = useMemo(() => {
    let data = [...reservations];

    // Lab restriction
    if (isLabRestricted && userLabDbName) {
      data = data.filter(r => r.location === userLabDbName);
    }

    if (filterStatus !== "All") {
      data = data.filter(r => r.status === filterStatus.toLowerCase());
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(r =>
        r.itemName.toLowerCase().includes(term) ||
        r.reservedByName.toLowerCase().includes(term) ||
        r.controlId.toLowerCase().includes(term) ||
        r.purpose.toLowerCase().includes(term)
      );
    }

    data.sort((a, b) => {
      if (sortOption === "Newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === "Oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOption === "Needed Soonest") return new Date(a.neededDate).getTime() - new Date(b.neededDate).getTime();
      return 0;
    });
    return data;
  }, [reservations, filterStatus, sortOption, searchTerm, isLabRestricted, userLabDbName]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- HANDLERS ---
  const openModal = () => {
    setSelectedItem(null);
    setItemSearch("");
    setForm({ quantity: 1, purpose: "", neededDate: "", returnDate: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === selectedItem);
    if (!item || !form.neededDate) return;

    const { data: { session } } = await supabase.auth.getSession();
    const { data: userData } = await supabase.from("users").select("username").eq("id", session?.user?.id).single();

    await addReservation({
      itemId: item.id,
      itemName: item.name,
      controlId: item.controlId,
      quantity: form.quantity,
      location: item.location,
      reservedBy: session?.user?.id || null,
      reservedByName: userData?.username || session?.user?.email || "Unknown",
      purpose: form.purpose,
      neededDate: form.neededDate,
      returnDate: form.returnDate,
      notes: form.notes,
    });
    setIsModalOpen(false);
  };

  const handleApprove = async (id: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    await updateReservationStatus(id, "approved", session?.user?.id || undefined);
  };

  const handleReject = async (id: number) => {
    const confirmed = await showConfirm({ title: "Reject Reservation", message: "Are you sure you want to reject this reservation?", variant: "danger", confirmText: "Reject", cancelText: "Cancel" });
    if (confirmed) {
      const { data: { session } } = await supabase.auth.getSession();
      await updateReservationStatus(id, "rejected", session?.user?.id || undefined);
    }
  };

  const handleComplete = async (id: number) => {
    await updateReservationStatus(id, "completed");
  };

  const handleCancel = async (id: number) => {
    const confirmed = await showConfirm({ title: "Cancel Reservation", message: "Are you sure you want to cancel this reservation?", variant: "danger", confirmText: "Yes, Cancel", cancelText: "No" });
    if (confirmed) await cancelReservation(id);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({ title: "Delete Reservation", message: "Are you sure you want to permanently delete this reservation?", variant: "danger", confirmText: "Delete", cancelText: "Cancel" });
    if (confirmed) await deleteReservation(id);
  };

  // --- STATS ---
  const stats = useMemo(() => {
    const visible = isLabRestricted && userLabDbName ? reservations.filter(r => r.location === userLabDbName) : reservations;
    return {
      total: visible.length,
      pending: visible.filter(r => r.status === "pending").length,
      approved: visible.filter(r => r.status === "approved").length,
      completed: visible.filter(r => r.status === "completed").length,
    };
  }, [reservations, isLabRestricted, userLabDbName]);

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Reservations</h1>
          <p className="text-gray-400 mt-1">Reserve equipment from the inventory for upcoming use.</p>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white", bg: "bg-white/5" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Approved", value: stats.approved, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Completed", value: stats.completed, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-white/10 rounded-2xl p-4`}>
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* CONTROL BAR */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 p-3 md:p-4 rounded-2xl flex flex-col gap-4 w-full shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* New Reservation button */}
          <button onClick={openModal} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap shrink-0">
            <Plus size={16} /> New Reservation
          </button>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search by item, person, purpose..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-500" />
          </div>

          {/* Status filter */}
          <div className="relative" ref={statusDropdownRef}>
            <button onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setSortDropdownOpen(false); }} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              <Filter size={14} className="text-gray-500" />
              <span className="text-white text-xs font-medium">{filterStatus === "All" ? "All Status" : filterStatus}</span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {statusDropdownOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 mt-2 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  {["All", "Pending", "Approved", "Rejected", "Completed", "Cancelled"].map((opt) => (
                    <button key={opt} onClick={() => { setFilterStatus(opt); setCurrentPage(1); setStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${filterStatus === opt ? "bg-indigo-500/20 text-indigo-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}>
                      {opt}
                      {filterStatus === opt && <CheckCircle size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort */}
          <div className="relative" ref={sortDropdownRef}>
            <button onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setStatusDropdownOpen(false); }} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              <ArrowUpDown size={14} className="text-gray-500" />
              <span className="text-white text-xs font-medium">{sortOption}</span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {sortDropdownOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.15 }} className="absolute top-full right-0 mt-2 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  {["Newest", "Oldest", "Needed Soonest"].map((opt) => (
                    <button key={opt} onClick={() => { setSortOption(opt); setSortDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${sortOption === opt ? "bg-indigo-500/20 text-indigo-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}>
                      {opt}
                      {sortOption === opt && <CheckCircle size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-xs border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Requested By</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Purpose</th>
              <th className="px-4 py-3 text-center font-medium">Qty</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Needed</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-20 text-gray-500">
                  <CalendarClock size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No reservations found.</p>
                </td>
              </tr>
            ) : (
              currentItems.map((res) => (
                <motion.tr key={res.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/5 transition-colors">
                  {/* Item */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white text-xs">{res.itemName}</span>
                      <span className="text-gray-500 text-[10px]">{res.controlId} &middot; {res.location}</span>
                    </div>
                  </td>
                  {/* Requested By */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-white text-xs">{res.reservedByName}</span>
                  </td>
                  {/* Purpose */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-gray-300 text-xs line-clamp-1">{res.purpose || "-"}</span>
                  </td>
                  {/* Qty */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-white text-xs font-medium">{res.quantity}</span>
                  </td>
                  {/* Needed Date */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-300 text-xs">{res.neededDate ? new Date(res.neededDate).toLocaleDateString() : "-"}</span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-1 rounded-lg border ${STATUS_COLORS[res.status]}`}>
                      {STATUS_ICONS[res.status]}
                      {res.status}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Approve / Reject for approvers on pending */}
                      {isApprover && res.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(res.id)} title="Approve" className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => handleReject(res.id)} title="Reject" className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {/* Complete for approvers on approved */}
                      {isApprover && res.status === "approved" && (
                        <button onClick={() => handleComplete(res.id)} title="Mark Completed" className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors">
                          <RotateCcw size={16} />
                        </button>
                      )}
                      {/* Cancel own pending reservation */}
                      {res.status === "pending" && (
                        <button onClick={() => handleCancel(res.id)} title="Cancel" className="p-1.5 rounded-lg hover:bg-gray-500/20 text-gray-400 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                      {/* Delete for approvers on closed statuses */}
                      {isApprover && ["rejected", "completed", "cancelled"].includes(res.status) && (
                        <button onClick={() => handleDelete(res.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${currentPage === p ? "bg-white text-black border-white" : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* NEW RESERVATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">New Reservation</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={18} className="text-gray-400" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Item Picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Select Item *</label>
                  <div className="relative" ref={itemDropdownRef}>
                    <button type="button" onClick={() => setItemDropdownOpen(!itemDropdownOpen)} className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white hover:border-white/20 transition-colors">
                      <span>{selectedItem ? inventory.find(i => i.id === selectedItem)?.name : "Choose an item..."}</span>
                      <ChevronDown size={14} className={`text-gray-500 transition-transform ${itemDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {itemDropdownOpen && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-white/10">
                            <input type="text" placeholder="Search items..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-gray-500" />
                          </div>
                          <div className="overflow-y-auto max-h-48">
                            {availableItems.length === 0 ? (
                              <p className="text-xs text-gray-500 p-3 text-center">No available items found.</p>
                            ) : (
                              availableItems.map((item) => (
                                <button key={item.id} type="button" onClick={() => { setSelectedItem(item.id); setItemDropdownOpen(false); setForm(f => ({ ...f, quantity: Math.min(f.quantity, item.quantity) })); }} className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${selectedItem === item.id ? "bg-indigo-500/20 text-indigo-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}>
                                  <div>
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-gray-500 ml-2">{item.controlId}</span>
                                  </div>
                                  <span className="text-gray-500">Qty: {item.quantity}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Quantity *</label>
                  <input type="number" min={1} max={selectedItem ? (inventory.find(i => i.id === selectedItem)?.quantity || 1) : 1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Purpose *</label>
                  <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required rows={2} placeholder="Describe the reason for this reservation..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-500 resize-none" />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Date Needed *</label>
                    <input type="date" value={form.neededDate} onChange={(e) => setForm({ ...form, neededDate: e.target.value })} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Expected Return</label>
                    <input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Additional Notes</label>
                  <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-500" />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
                  <button type="submit" disabled={!selectedItem || !form.neededDate || !form.purpose} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20">
                    <Save size={14} /> Submit Reservation
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
