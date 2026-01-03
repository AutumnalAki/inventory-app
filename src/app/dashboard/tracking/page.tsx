"use client";

import React, { useState } from "react";
import { 
  Search, Plus, Filter, Trash2, CheckCircle, 
  Clock, MapPin, User, Calendar, RotateCcw, X, Save, ArrowUpDown, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Mock Data ---
const MOCK_LOANS = [
  { 
    id: 1, 
    studentId: "20231010803", 
    itemName: "Weight Holder", 
    controlId: "PHY-004", 
    qty: 1, 
    location: "Physics Lab", 
    teacher: "Engr. Lorenzo Diuco", 
    room: "613", 
    section: "NASC 2031", 
    dateGiven: "Jun 23, 2025 • 11:29 PM", 
    dateReceived: "-", 
    status: "Borrowed" 
  },
  { 
    id: 2, 
    studentId: "20241020132", 
    itemName: "Discover Density Set", 
    controlId: "PHY-005", 
    qty: 1, 
    location: "Physics Lab", 
    teacher: "Engr. Lorenzo Diuco", 
    room: "613", 
    section: "NASC 2031", 
    dateGiven: "Jun 23, 2025 • 11:28 PM", 
    dateReceived: "-", 
    status: "Borrowed" 
  },
  { 
    id: 3, 
    studentId: "20241050450", 
    itemName: "VEX Clawbot Kit", 
    controlId: "VEX-007", 
    qty: 1, 
    location: "Robotics Lab", 
    teacher: "Engr. Sarah Lee", 
    room: "404", 
    section: "ROBO 101", 
    dateGiven: "Jun 22, 2025 • 09:15 AM", 
    dateReceived: "Jun 22, 2025 • 04:00 PM", 
    status: "Returned" 
  },
  { 
    id: 4, 
    studentId: "20231099111", 
    itemName: "Oscilloscope", 
    controlId: "ECE-012", 
    qty: 1, 
    location: "ECE Lab", 
    teacher: "Engr. Mike Chen", 
    room: "302", 
    section: "ECE 101", 
    dateGiven: "Jun 21, 2025 • 02:30 PM", 
    dateReceived: "-", 
    status: "Borrowed" 
  },
];

const LABS = ["All Labs", "Computer Lab", "Physics Lab", "Chemistry Lab", "ECE Lab", "Robotics Lab", "ME Lab"];

export default function ItemTrackingPage() {
  const [loans, setLoans] = useState(MOCK_LOANS);
  
  // --- Filter & Sort States ---
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLab, setFilterLab] = useState("All Labs"); // NEW Location Filter
  const [sortOption, setSortOption] = useState("Newest");
  
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

  // --- Logic: Filter by Status -> Filter by Lab -> Sort ---
  const processedLoans = [...loans]
    .filter(loan => filterStatus === "All" ? true : loan.status === filterStatus)
    .filter(loan => filterLab === "All Labs" ? true : loan.location === filterLab) // Apply Lab Filter
    .sort((a, b) => {
      if (sortOption === "Newest") return b.id - a.id; 
      if (sortOption === "Location") return a.location.localeCompare(b.location);
      if (sortOption === "Status") return a.status.localeCompare(b.status);
      return 0;
    });

  const activeLoans = loans.filter(l => l.status === "Borrowed").length;
  const returnedToday = loans.filter(l => l.status === "Returned").length;

  const handleReceive = (id: number) => {
    const now = new Date();
    const dateString = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    
    setLoans(loans.map(loan => 
      loan.id === id ? { ...loan, status: "Returned", dateReceived: dateString } : loan
    ));
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this loan record?")) {
      setLoans(loans.filter(l => l.id !== id));
    }
  };

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const dateString = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    
    const loanEntry = {
      id: loans.length + 1,
      ...newLoan,
      dateGiven: dateString,
      dateReceived: "-",
      status: "Borrowed"
    };

    setLoans([loanEntry, ...loans]);
    setIsModalOpen(false);
    setNewLoan({ studentId: "", section: "", itemName: "", controlId: "", qty: 1, location: "Computer Lab", teacher: "", room: "" });
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Item Tracking</h1>
        <p className="text-gray-400 mt-1">Monitor active loans, student borrowing history, and returns.</p>
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-xl text-amber-400">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tabular-nums">{activeLoans}</div>
              <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">Active Loans</div>
            </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tabular-nums">{returnedToday}</div>
              <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">Returned Today</div>
            </div>
        </div>
      </div>

      {/* --- Controls Bar --- */}
      <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xl flex flex-col xl:flex-row items-center justify-between gap-4">
        
        {/* Left: Filters & Sorts */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors">
            <Filter size={14} className="text-gray-500" />
            <span className="text-gray-400 text-xs hidden sm:inline">Status:</span>
            <div className="relative">
                <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-4"
                >
                <option value="All" className="bg-gray-900">All</option>
                <option value="Borrowed" className="bg-gray-900">Active</option>
                <option value="Returned" className="bg-gray-900">Returned</option>
                </select>
            </div>
          </div>

          {/* NEW: Location Filter */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors">
            <MapPin size={14} className="text-indigo-400" />
            <span className="text-gray-400 text-xs hidden sm:inline">Lab:</span>
            <div className="relative">
                <select 
                value={filterLab}
                onChange={(e) => setFilterLab(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-4"
                >
                {LABS.map(lab => (
                    <option key={lab} value={lab} className="bg-gray-900">{lab}</option>
                ))}
                </select>
            </div>
          </div>

          {/* Sort Option */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors">
            <ArrowUpDown size={14} className="text-gray-500" />
            <span className="text-gray-400 text-xs hidden sm:inline">Sort:</span>
            <div className="relative">
                <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-4"
                >
                <option value="Newest" className="bg-gray-900">Newest</option>
                <option value="Location" className="bg-gray-900">Location</option>
                <option value="Status" className="bg-gray-900">Status</option>
                </select>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative flex-1 xl:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder="Search Student ID..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Right: Add Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 w-full xl:w-auto"
        >
          <Plus size={16} />
          New Equipment Loan
        </button>
      </div>

      {/* --- Main Table --- */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex flex-col">
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
                        <label className="text-xs font-medium text-gray-400 uppercase">Location</label>
                        <select 
                            value={newLoan.location}
                            onChange={(e) => setNewLoan({...newLoan, location: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                        >
                            {LABS.filter(l => l !== "All Labs").map(lab => (
                                <option key={lab} value={lab} className="bg-gray-900">{lab}</option>
                            ))}
                        </select>
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