"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Plus, Filter, Trash2, CheckCircle, 
  Clock, MapPin, User, Calendar, RotateCcw, X, Save, ArrowUpDown, ChevronDown, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// 1. Import the hook
import { useInventory } from "@/context/InventoryContext";
import { useRole } from "@/context/RoleContext";

const LABS = ["All Labs", "Computer Lab", "Physics Lab", "Chem Lab", "ECE Lab", "ME Lab", "EE Lab", "CE Lab"];

// Role to Lab Mapping - maps role names to their lab filter value
const ROLE_LAB_MAPPING: Record<string, string> = {
  "ME Lab": "ME Lab",
  "CE Lab": "CE Lab",
  "ECE Lab": "ECE Lab",
  "CPE Lab": "Computer Lab",
  "CHEM Lab": "Chem Lab",
  "PHYS Lab": "Physics Lab",
  "EE Lab": "EE Lab"
};

// Roles with full access to all labs
const FULL_ACCESS_ROLES = ["Developer", "Administrator", "Program Chair", "Faculty"];

export default function ItemTrackingPage() {
  // 2. Use Global State
  const { loans, addLoan, returnLoan, deleteLoan } = useInventory();
  const { role } = useRole();
  
  // Check if user has restricted lab access
  const isLabRestricted = !FULL_ACCESS_ROLES.includes(role) && ROLE_LAB_MAPPING[role];
  const userLabFilter = isLabRestricted ? ROLE_LAB_MAPPING[role] : null;
  
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLab, setFilterLab] = useState("All Labs");
  const [sortOption, setSortOption] = useState("Newest");
  
  // Dropdown states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [labDropdownOpen, setLabDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  
  // Refs for dropdown containers
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const labDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLoan, setNewLoan] = useState({
    studentId: "",
    section: "",
    itemName: "",
    controlId: "",
    qty: 1,
    location: "Computer Lab",
    teacher: "",
    room: "",
  });
  
  // Modal dropdown state
  const [modalLocationOpen, setModalLocationOpen] = useState(false);
  const modalLocationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (labDropdownRef.current && !labDropdownRef.current.contains(event.target as Node)) {
        setLabDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (modalLocationRef.current && !modalLocationRef.current.contains(event.target as Node)) {
        setModalLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set lab filter based on role restriction
  useEffect(() => {
    if (isLabRestricted && userLabFilter) {
      setFilterLab(userLabFilter);
    }
  }, [isLabRestricted, userLabFilter]);

  // Set default location for restricted users when opening modal
  useEffect(() => {
    if (isLabRestricted && userLabFilter) {
      setNewLoan(prev => ({ ...prev, location: userLabFilter }));
    }
  }, [isLabRestricted, userLabFilter]);

  const processedLoans = useMemo(() => {
    let filtered = [...loans];
    
    // Apply role-based lab restriction first
    if (isLabRestricted && userLabFilter) {
      filtered = filtered.filter(loan => loan.location === userLabFilter);
    } else if (filterLab !== "All Labs") {
      filtered = filtered.filter(loan => loan.location === filterLab);
    }
    
    // Apply status filter
    if (filterStatus !== "All") {
      filtered = filtered.filter(loan => loan.status === filterStatus);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortOption === "Newest") return b.id - a.id; 
      if (sortOption === "Location") return a.location.localeCompare(b.location);
      if (sortOption === "Status") return a.status.localeCompare(b.status);
      return 0;
    });
    
    return filtered;
  }, [loans, filterStatus, filterLab, sortOption, isLabRestricted, userLabFilter]);

  // Stats based on filtered data for restricted users
  const filteredLoansForStats = useMemo(() => {
    if (isLabRestricted && userLabFilter) {
      return loans.filter(l => l.location === userLabFilter);
    }
    return loans;
  }, [loans, isLabRestricted, userLabFilter]);

  const activeLoans = filteredLoansForStats.filter(l => l.status === "Borrowed").length;
  const returnedToday = filteredLoansForStats.filter(l => l.status === "Returned").length;

  const handleReceive = (id: number) => {
    returnLoan(id); // Global Return
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this loan record?")) {
      deleteLoan(id); // Global Delete
    }
  };

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    addLoan(newLoan); // Global Add Loan (Updates Inventory automatically)
    setIsModalOpen(false);
    // Reset with user's lab if restricted
    const defaultLocation = isLabRestricted && userLabFilter ? userLabFilter : "Computer Lab";
    setNewLoan({ studentId: "", section: "", itemName: "", controlId: "", qty: 1, location: defaultLocation, teacher: "", room: "" });
  };

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col relative">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Item Tracking</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Monitor active loans, student borrowing history, and returns.</p>
        {isLabRestricted && userLabFilter && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
            <Lock size={12} />
            <span>Viewing loans for {userLabFilter}</span>
          </div>
        )}
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4">
            <div className="bg-amber-500/20 p-2 md:p-3 rounded-lg md:rounded-xl text-amber-400">
              <Clock size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">{activeLoans}</div>
              <div className="text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">Active Loans</div>
            </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4">
            <div className="bg-emerald-500/20 p-2 md:p-3 rounded-lg md:rounded-xl text-emerald-400">
              <CheckCircle size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">{returnedToday}</div>
              <div className="text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">Returned</div>
            </div>
        </div>
      </div>

      {/* --- Controls Bar --- */}
      <div className="bg-white/5 border border-white/10 p-2 md:p-2.5 rounded-xl md:rounded-2xl backdrop-blur-xl flex flex-col gap-2 md:gap-4 relative z-20">
        
        {/* Top Row: Filters */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full">
          
          {/* Status Filter Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button 
              onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setLabDropdownOpen(false); setSortDropdownOpen(false); }}
              className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              <Filter size={14} className="text-gray-500" />
              <span className="text-white text-xs font-medium">{filterStatus === "All" ? "All Status" : filterStatus}</span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {statusDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] overflow-hidden"
                >
                  {[
                    { value: "All", label: "All Status" },
                    { value: "Borrowed", label: "Active" },
                    { value: "Returned", label: "Returned" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => { setFilterStatus(option.value); setStatusDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                        filterStatus === option.value 
                          ? 'bg-indigo-500/20 text-indigo-400' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {option.label}
                      {filterStatus === option.value && <CheckCircle size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Location Filter Dropdown */}
          {isLabRestricted ? (
            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 opacity-60">
              <Lock size={14} className="text-gray-500" />
              <span className="text-white text-xs font-medium">{userLabFilter}</span>
            </div>
          ) : (
            <div className="relative" ref={labDropdownRef}>
              <button 
                onClick={() => { setLabDropdownOpen(!labDropdownOpen); setStatusDropdownOpen(false); setSortDropdownOpen(false); }}
                className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <MapPin size={14} className="text-indigo-400" />
                <span className="text-white text-xs font-medium">{filterLab === "All Labs" ? "All Labs" : filterLab.replace(" Lab", "")}</span>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${labDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {labDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] overflow-hidden"
                  >
                    {LABS.map((lab) => (
                      <button
                        key={lab}
                        onClick={() => { setFilterLab(lab); setLabDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                          filterLab === lab 
                            ? 'bg-indigo-500/20 text-indigo-400' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {lab === "All Labs" ? "All Labs" : lab.replace(" Lab", "")}
                        {filterLab === lab && <CheckCircle size={14} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Sort Option Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button 
              onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setStatusDropdownOpen(false); setLabDropdownOpen(false); }}
              className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              <ArrowUpDown size={14} className="text-gray-500" />
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
                  className="absolute top-full left-0 mt-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] overflow-hidden"
                >
                  {["Newest", "Location", "Status"].map((option) => (
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
        
        {/* Bottom Row: Search & Add Button */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder="Search Student ID..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {/* Add Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            data-tour="add-loan-btn"
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-5 py-2 rounded-lg md:rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Loan</span>
          </button>
        </div>
      </div>

      {/* --- Main Table - Desktop --- */}
      <div className="hidden md:flex bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                <th className="p-4 w-[15%]">Student Details</th>
                <th className="p-4 w-[15%]">Item Details</th>
                <th className="p-4 w-[12%]">Location/Room</th>
                <th className="p-4 w-[12%]">Teacher</th>
                <th className="p-4 w-[12%]">Date Borrowed</th>
                <th className="p-4 w-[12%]">Date Received</th>
                <th className="p-4 w-[10%]">Status</th>
                <th className="p-4 text-right w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {processedLoans.length > 0 ? (
                processedLoans.map((loan) => (
                  <tr key={loan.id} className="group hover:bg-white/[0.07] transition-colors">
                    
                    {/* Student */}
                    <td className="p-4">
                      <div className="font-bold text-emerald-400 text-sm tabular-nums tracking-wide">{loan.studentId}</div>
                      <div className="text-gray-500 mt-1 font-medium">{loan.section}</div>
                    </td>

                    {/* Item */}
                    <td className="p-4">
                      <div className="font-bold text-gray-200 text-sm">{loan.itemName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-mono border border-white/5">{loan.controlId}</span>
                        <span className="text-gray-500 font-medium">Qty: {loan.qty}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <MapPin size={12} className="text-indigo-400" />
                        {loan.location}
                      </div>
                      <div className="pl-4 mt-0.5 text-gray-500">Room {loan.room}</div>
                    </td>

                    {/* Teacher */}
                    <td className="p-4">
                       <div className="flex items-center gap-1.5 text-gray-300">
                        <User size={12} className="text-indigo-400" />
                        {loan.teacher}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-300 tabular-nums">
                        <Calendar size={12} className="text-gray-500" />
                        {loan.dateGiven.split("•")[0]}
                      </div>
                      <div className="pl-4 text-gray-500 text-[10px] mt-0.5">
                        {loan.dateGiven.split("•")[1]}
                      </div>
                    </td>

                    <td className="p-4 text-gray-500 tabular-nums">
                      {loan.dateReceived === "-" ? "-" : (
                        <>
                           <div>{loan.dateReceived.split("•")[0]}</div>
                           <div className="text-[10px] mt-0.5">{loan.dateReceived.split("•")[1]}</div>
                        </>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <StatusBadge status={loan.status} />
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {loan.status === "Borrowed" && (
                          <button 
                            onClick={() => handleReceive(loan.id)}
                            className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1.5 rounded-lg transition-all"
                            title="Mark as Returned"
                          >
                            <RotateCcw size={12} />
                            <span className="hidden xl:inline">Receive</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(loan.id)}
                          className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1.5 rounded-lg transition-all"
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Mobile Cards View --- */}
      <div className="md:hidden flex-1 overflow-y-auto space-y-3">
        {processedLoans.length > 0 ? (
          processedLoans.map((loan) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between p-3 bg-black/20 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-500/20 p-1.5 rounded text-emerald-400">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-400 text-sm tabular-nums">{loan.studentId}</p>
                    <p className="text-[10px] text-gray-500">{loan.section}</p>
                  </div>
                </div>
                <StatusBadge status={loan.status} />
              </div>

              {/* Card Body */}
              <div className="p-3 space-y-2">
                {/* Item Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{loan.itemName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-mono z-100">{loan.controlId}</span>
                      <span className="text-[10px] text-gray-500">Qty: {loan.qty}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Teacher */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin size={10} className="text-indigo-400" />
                    <span className="truncate">{loan.location}</span>
                    {loan.room && <span className="text-gray-600">• Rm {loan.room}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <User size={10} className="text-gray-500" />
                    <span className="truncate">{loan.teacher}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                  <div className="text-gray-500">
                    <Calendar size={10} className="inline mr-1" />
                    Borrowed: <span className="text-gray-300">{loan.dateGiven.split("•")[0]}</span>
                  </div>
                  {loan.dateReceived !== "-" && (
                    <div className="text-emerald-400/70">
                      Returned: {loan.dateReceived.split("•")[0]}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 p-2 bg-black/20 border-t border-white/5">
                {loan.status === "Borrowed" && (
                  <button 
                    onClick={() => handleReceive(loan.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-lg text-xs font-medium transition-all"
                  >
                    <RotateCcw size={14} /> Mark Returned
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(loan.id)}
                  className={`flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-lg text-xs font-medium transition-all ${loan.status === "Borrowed" ? "px-3" : "flex-1"}`}
                >
                  <Trash2 size={14} /> {loan.status !== "Borrowed" && "Delete"}
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500 text-sm">No records found.</p>
          </div>
        )}
      </div>

      {/* --- ADD LOAN MODAL (Unchanged) --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <h2 className="text-lg font-bold text-white">New Equipment Loan</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddLoan} className="p-6 space-y-4">
                {/* Student Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Student ID</label>
                    <input required type="text" placeholder="e.g. 20231010803" value={newLoan.studentId} onChange={(e) => setNewLoan({...newLoan, studentId: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Program/Section</label>
                    <input required type="text" placeholder="e.g. NASC 2031" value={newLoan.section} onChange={(e) => setNewLoan({...newLoan, section: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                {/* Item Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Item Name</label>
                    <input required type="text" placeholder="e.g. Weight Holder" value={newLoan.itemName} onChange={(e) => setNewLoan({...newLoan, itemName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Control ID</label>
                    <input required type="text" placeholder="e.g. PHY-004" value={newLoan.controlId} onChange={(e) => setNewLoan({...newLoan, controlId: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                {/* Location Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase flex items-center gap-1.5">
                          Location {isLabRestricted && <Lock size={10} className="text-gray-500" />}
                        </label>
                        {isLabRestricted ? (
                          <div className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <Lock size={12} />{userLabFilter}
                          </div>
                        ) : (
                          <div className="relative" ref={modalLocationRef}>
                            <button 
                              type="button"
                              onClick={() => setModalLocationOpen(!modalLocationOpen)}
                              className="w-full flex items-center z-100 justify-between bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:border-white/20 transition-colors"
                            >
                              <span>{newLoan.location}</span>
                              <ChevronDown size={14} className={`text-gray-500 transition-transform ${modalLocationOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {modalLocationOpen && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-100 overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                                >
                                  {LABS.filter(l => l !== "All Labs").map((lab) => (
                                    <button
                                      key={lab}
                                      type="button"
                                      onClick={() => { setNewLoan({...newLoan, location: lab}); setModalLocationOpen(false); }}
                                      className={`w-full text-left z-100 px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                                        newLoan.location === lab 
                                          ? 'bg-indigo-500/20 text-indigo-400' 
                                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                      }`}
                                    >
                                      {lab}
                                      {newLoan.location === lab && <CheckCircle size={14} />}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase">Room Number</label>
                        <input type="text" placeholder="e.g. 613" value={newLoan.room} onChange={(e) => setNewLoan({...newLoan, room: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                </div>

                 <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Assigned Teacher</label>
                    <input required type="text" placeholder="e.g. Engr. Lorenzo Diuco" value={newLoan.teacher} onChange={(e) => setNewLoan({...newLoan, teacher: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-900/20">
                    <Save size={16} />
                    Confirm Loan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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