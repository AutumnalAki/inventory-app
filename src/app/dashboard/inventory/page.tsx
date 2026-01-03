"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, Filter, Edit2, Trash2, 
  ChevronDown, ArrowUpDown, CheckCircle, AlertCircle, XCircle, 
  MapPin, Hash, FileText, MoreHorizontal, X, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Initial Mock Data ---
const INITIAL_INVENTORY = [
  { id: 1, name: "V5 Robot Brain", controlId: "VEX-001", quantity: 12, supplier: "VEX Robotics", location: "Computer Lab", stock: "In Stock", condition: "Available", remarks: "FW Updated v1.2" },
  { id: 2, name: "Smart Motor (11W)", controlId: "VEX-002", quantity: 4, supplier: "VEX Robotics", location: "ECE Lab", stock: "Low Stock", condition: "Available", remarks: "Order pending approval" },
  { id: 3, name: "Optical Sensor", controlId: "VEX-003", quantity: 0, supplier: "Mouser", location: "Physics Lab", stock: "Out of Stock", condition: "Broken", remarks: "Lens cracked, needs triage" },
  { id: 4, name: "Aluminum C-Channel", controlId: "STR-055", quantity: 45, supplier: "Local Metal", location: "ME Lab", stock: "In Stock", condition: "Available", remarks: "-" },
  { id: 5, name: "393 Motor Controller", controlId: "LEG-012", quantity: 8, supplier: "VEX Legacy", location: "EE Lab", stock: "In Stock", condition: "For Repairs", remarks: "Soldering issue on pins" },
  { id: 6, name: "V5 Battery", controlId: "VEX-009", quantity: 20, supplier: "VEX Robotics", location: "Computer Lab", stock: "In Stock", condition: "Available", remarks: "Charged" },
  { id: 7, name: "Vision Sensor", controlId: "VEX-014", quantity: 2, supplier: "Mouser", location: "ECE Lab", stock: "Low Stock", condition: "Available", remarks: "-" },
];

const LABS = ["All Labs", "Computer Lab", "ECE Lab", "CE Lab", "Chem Lab", "Physics Lab", "EE Lab", "ME Lab"];

export default function InventoryPage() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  
  // --- FILTER & SORT STATES ---
  const [selectedLab, setSelectedLab] = useState("All Labs");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOption, setSortOption] = useState("Newest");
  
  // --- PAGINATION STATES ---
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", controlId: "", quantity: 0, location: "", supplier: "", stock: "In Stock", condition: "Available", remarks: ""
  });

  // --- LOGIC: FILTER -> SORT -> PAGINATE ---
  const processedData = useMemo(() => {
    let data = [...inventory];

    // 1. Filter by Location
    if (selectedLab !== "All Labs") {
      data = data.filter(item => item.location === selectedLab);
    }

    // 2. Filter by Status
    if (filterStatus !== "All") {
      data = data.filter(item => item.stock === filterStatus);
    }

    // 3. Sort
    data.sort((a, b) => {
      if (sortOption === "Newest") return b.id - a.id;
      if (sortOption === "Name (A-Z)") return a.name.localeCompare(b.name);
      if (sortOption === "Qty (High)") return b.quantity - a.quantity;
      if (sortOption === "Qty (Low)") return a.quantity - b.quantity;
      return 0;
    });

    return data;
  }, [inventory, selectedLab, filterStatus, sortOption]);

  // 4. Pagination Slicing
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = processedData.slice(startIndex, startIndex + itemsPerPage);

  // --- HANDLERS ---

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      setInventory(inventory.filter((item) => item.id !== id));
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setNewItem({ name: "", controlId: "", quantity: 0, location: "", supplier: "", stock: "In Stock", condition: "Available", remarks: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setNewItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && currentId !== null) {
      setInventory(inventory.map((item) => item.id === currentId ? { ...item, ...newItem } : item));
    } else {
      const itemToAdd = {
        id: inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1,
        ...newItem,
      };
      setInventory([itemToAdd, ...inventory]);
    }
    setIsModalOpen(false);
  };

  // Helper to reset page when filters change
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1); // Reset to page 1 to avoid empty states
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-gray-400 mt-1">Manage and track equipment across all laboratories.</p>
      </div>

      {/* --- ACTION BAR --- */}
      <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xl flex flex-col xl:flex-row items-center justify-between gap-2 w-full">
        
        {/* Left Actions */}
        <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
           <button 
             onClick={openAddModal}
             className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap flex-1 xl:flex-none"
           >
            <Plus size={16} />
            Add Item
          </button>

          {/* Show Limit Dropdown */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hidden md:flex">
            <span className="text-gray-400 text-xs font-medium">Show:</span>
            <div className="relative">
               <select 
                value={itemsPerPage}
                onChange={(e) => handleFilterChange(setItemsPerPage, Number(e.target.value))}
                className="appearance-none bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-5"
               >
                <option className="bg-gray-900" value={5}>5</option>
                <option className="bg-gray-900" value={25}>25</option>
                <option className="bg-gray-900" value={50}>50</option>
                <option className="bg-gray-900" value={100}>100</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
            </div>
          </div>
        </div>

        {/* Center Tabs (Location Filter) */}
        <div className="flex-1 overflow-x-auto no-scrollbar mask-linear-fade flex justify-center w-full">
            <div className="flex items-center gap-1 min-w-max px-2">
                {LABS.map((lab) => (
                <button
                    key={lab}
                    onClick={() => handleFilterChange(setSelectedLab, lab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                    selectedLab === lab 
                        ? "bg-white text-black border-white shadow-sm" 
                        : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
                    }`}
                >
                    {lab}
                </button>
                ))}
            </div>
        </div>

        {/* Right Filters */}
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-end gap-2 w-full xl:w-auto shrink-0">
          
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex-1 xl:flex-none justify-between xl:justify-start">
            <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-500" />
                <span className="text-gray-400 text-xs hidden lg:inline">Status:</span>
            </div>
            <div className="relative">
              <select 
                value={filterStatus}
                onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
                className="appearance-none bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pl-2 pr-6 w-full xl:w-24 text-right xl:text-left"
              >
                <option className="bg-gray-900" value="All">All</option>
                <option className="bg-gray-900" value="In Stock">In Stock</option>
                <option className="bg-gray-900" value="Low Stock">Low Stock</option>
                <option className="bg-gray-900" value="Out of Stock">Out of Stock</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
            </div>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex-1 xl:flex-none justify-between xl:justify-start">
             <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-500" />
                <span className="text-gray-400 text-xs hidden lg:inline">Sort:</span>
             </div>
            <div className="relative">
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="appearance-none bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pl-2 pr-6 w-full xl:w-28 text-right xl:text-left"
              >
                <option className="bg-gray-900">Newest</option>
                <option className="bg-gray-900">Name (A-Z)</option>
                <option className="bg-gray-900">Qty (High)</option>
                <option className="bg-gray-900">Qty (Low)</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                <th className="p-4 w-[25%]">Item Details</th>
                <th className="p-4 w-[12%]">Control ID</th>
                <th className="p-4 text-center w-[10%]">Qty</th>
                <th className="p-4 w-[15%]">Location</th>
                <th className="p-4 w-[12%]">Status</th>
                <th className="p-4 w-[12%]">Condition</th>
                <th className="p-4 w-[15%]">Remarks</th>
                <th className="p-4 text-right w-[5%]"><MoreHorizontal size={16} className="ml-auto"/></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-white/[0.07] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm tracking-tight">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">{item.supplier}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 bg-white/5 w-fit px-2 py-1 rounded border border-white/5">
                          <Hash size={10} className="text-gray-500" />
                          <span className="text-gray-300 font-mono text-xs">{item.controlId}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center bg-white/5 border border-white/10 w-12 h-10 rounded-lg group-hover:border-white/20 transition-colors">
                          <span className={`text-sm font-bold tabular-nums ${item.quantity === 0 ? "text-red-400" : "text-white"}`}>
                              {item.quantity < 10 && item.quantity > 0 ? `0${item.quantity}` : item.quantity}
                          </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-300">
                          <div className="bg-indigo-500/10 p-1.5 rounded-md text-indigo-400">
                              <MapPin size={12} />
                          </div>
                          <span className="text-xs font-medium">{item.location}</span>
                      </div>
                    </td>
                    <td className="p-4"><StockBadge status={item.stock} /></td>
                    <td className="p-4"><ConditionBadge status={item.condition} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-[140px]">
                          <FileText size={12} className="text-gray-600 shrink-0" />
                          <span className="text-gray-400 text-xs truncate" title={item.remarks}>{item.remarks}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(item)} className="p-2 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 text-sm">
                    No items found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="mt-auto p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <span>
            Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} items
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/20 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/20 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* --- ADD/EDIT ITEM MODAL (Same as before) --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? "Edit Item" : "Add New Item"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Item Name</label>
                    <input required type="text" placeholder="e.g. V5 Smart Motor" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Control ID</label>
                    <input required type="text" placeholder="e.g. VEX-099" value={newItem.controlId} onChange={(e) => setNewItem({...newItem, controlId: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Quantity</label>
                    <input required type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>

                   <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Location</label>
                    <div className="relative">
                      <select required value={newItem.location} onChange={(e) => setNewItem({...newItem, location: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                        <option value="" disabled>Select Laboratory</option>
                        {LABS.filter(lab => lab !== "All Labs").map((lab) => (
                          <option key={lab} value={lab} className="bg-gray-900">{lab}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Supplier</label>
                    <input type="text" placeholder="e.g. VEX Robotics" value={newItem.supplier} onChange={(e) => setNewItem({...newItem, supplier: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Condition</label>
                    <div className="relative">
                      <select value={newItem.condition} onChange={(e) => setNewItem({...newItem, condition: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                        <option className="bg-gray-900">Available</option>
                        <option className="bg-gray-900">Broken</option>
                        <option className="bg-gray-900">For Repairs</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>
                
                 <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Remarks</label>
                    <textarea rows={2} placeholder="Optional notes..." value={newItem.remarks} onChange={(e) => setNewItem({...newItem, remarks: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"/>
                  </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-900/20">
                    <Save size={16} />
                    {isEditing ? "Update Item" : "Save Item"}
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

// --- Helper Components ---

function StockBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "In Stock": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
    "Low Stock": "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    "Out of Stock": "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]",
  };

  const icons: Record<string, React.ReactNode> = {
    "In Stock": <CheckCircle size={10} className="mr-1.5" />,
    "Low Stock": <AlertCircle size={10} className="mr-1.5" />,
    "Out of Stock": <XCircle size={10} className="mr-1.5" />,
  };

  return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${styles[status]}`}>{icons[status]}{status}</span>;
}

function ConditionBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Available": "text-gray-400 bg-white/5 border-white/10",
    "Broken": "text-rose-400 bg-rose-950/30 border-rose-500/20",
    "For Repairs": "text-amber-400 bg-amber-950/30 border-amber-500/20",
  };
  return <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium border ${styles[status]}`}>{status}</span>;
}