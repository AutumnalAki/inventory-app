"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { 
  Plus, Filter, Edit2, Trash2, ChevronDown, ArrowUpDown, CheckCircle, AlertCircle, XCircle, 
  MapPin, Hash, MoreHorizontal, X, Save, Search, Wrench, Download, CheckSquare, Square, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation"; 
import { useInventory, Item } from "@/context/InventoryContext";
import { usePopup } from "@/context/PopupContext";
import { useRole } from "@/context/RoleContext";

// --- EXPORT LIBRARIES ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const LAB_MAPPING: Record<string, string> = {
  "All Labs": "All",
  "Computer Lab": "Computer Laboratory",
  "CE Lab": "Civil Engineering Laboratory",
  "Chem Lab": "Chemistry Laboratory",
  "Physics Lab": "Physics Laboratory",
  "EE Lab": "Electrical Engineering Laboratory",
  "ME Lab": "Mechanical Engineering Laboratory",
  "ECE Lab": "ECE Laboratory",
  "CPE Lab": "CPE Laboratory"
};
const LAB_TABS = Object.keys(LAB_MAPPING);

// Role to Lab Mapping - maps role names to their assigned lab tab
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

function InventoryContent() {
  const { inventory, addItem, updateItem, deleteItem, deleteItems, updateItems } = useInventory();
  const { role } = useRole();
  const searchParams = useSearchParams();

  // Check if user has restricted lab access
  const isLabRestricted = !FULL_ACCESS_ROLES.includes(role) && ROLE_LAB_MAPPING[role];
  const userLabTab = isLabRestricted ? ROLE_LAB_MAPPING[role] : null;
  const userLabDbName = userLabTab ? LAB_MAPPING[userLabTab] : null;

  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLab, setSelectedLab] = useState("All Labs");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCondition, setFilterCondition] = useState("All");
  const [sortOption, setSortOption] = useState("Newest");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Export UI State
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Dropdown states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Refs for dropdown containers
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);
  const conditionDropdownRef = React.useRef<HTMLDivElement>(null);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", controlId: "", quantity: 0, location: "", supplier: "", stock: "In Stock", condition: "Available", remarks: ""
  });
  
  // Modal dropdown states
  const [modalLocationOpen, setModalLocationOpen] = useState(false);
  const [modalConditionOpen, setModalConditionOpen] = useState(false);
  const modalLocationRef = React.useRef<HTMLDivElement>(null);
  const modalConditionRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (conditionDropdownRef.current && !conditionDropdownRef.current.contains(event.target as Node)) {
        setConditionDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (modalLocationRef.current && !modalLocationRef.current.contains(event.target as Node)) {
        setModalLocationOpen(false);
      }
      if (modalConditionRef.current && !modalConditionRef.current.contains(event.target as Node)) {
        setModalConditionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set lab filter based on role restriction
  useEffect(() => {
    if (isLabRestricted && userLabTab) {
      setSelectedLab(userLabTab);
    }
  }, [isLabRestricted, userLabTab]);

  // URL Params and Filtering Logic
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const conditionParam = searchParams.get("condition");
    if (statusParam) setFilterStatus(statusParam);
    if (conditionParam) setFilterCondition(conditionParam);
  }, [searchParams]);

  const processedData = useMemo(() => {
    let data = [...inventory];
    
    // Apply role-based lab restriction first
    if (isLabRestricted && userLabDbName) {
      data = data.filter(item => item.location === userLabDbName);
    } else if (selectedLab !== "All Labs") {
      const dbLocationName = LAB_MAPPING[selectedLab];
      data = data.filter(item => item.location === dbLocationName);
    }
    
    if (filterStatus !== "All") {
      if (filterStatus === "Critical") {
        data = data.filter(item => item.stock === "Low Stock" || item.stock === "Out of Stock");
      } else {
        data = data.filter(item => item.stock === filterStatus);
      }
    }
    if (filterCondition !== "All") {
      data = data.filter(item => item.condition === filterCondition);
    }
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(item => 
        item.name.toLowerCase().includes(lowerTerm) || 
        item.controlId.toLowerCase().includes(lowerTerm)
      );
    }
    data.sort((a, b) => {
      if (sortOption === "Newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOption === "Name (A-Z)") return a.name.localeCompare(b.name);
      if (sortOption === "Qty (High)") return b.quantity - a.quantity;
      if (sortOption === "Qty (Low)") return a.quantity - b.quantity;
      return 0;
    });
    return data;
  }, [inventory, selectedLab, filterStatus, filterCondition, sortOption, searchTerm]);

  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = processedData.slice(startIndex, startIndex + itemsPerPage);

  // --- EXPORT HANDLERS ---
  const getExportData = () => {
    if (processedData.length === 0) { alert("No data to export."); return null; }
    return processedData;
  };

  const exportPDF = () => {
    const data = getExportData();
    if (!data) return;

    const doc = new jsPDF();
    doc.text("Inventory List", 14, 20);
    
    const tableRows = data.map(item => [
      item.name, item.controlId, item.quantity, item.location, item.stock, item.condition
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Item Name', 'Control ID', 'Qty', 'Location', 'Status', 'Condition']],
      body: tableRows,
    });

    doc.save("Inventory_List.pdf");
    setIsExportOpen(false);
  };

  const exportExcel = () => {
    const data = getExportData();
    if (!data) return;

    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
       Name: item.name, ControlID: item.controlId, Qty: item.quantity, 
       Location: item.location, Supplier: item.supplier, Status: item.stock, 
       Condition: item.condition, Remarks: item.remarks
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Inventory_List.xlsx");
    setIsExportOpen(false);
  };

  const exportCSV = () => {
    const data = getExportData();
    if (!data) return;

    const headers = ["ID,Name,Control ID,Quantity,Location,Supplier,Stock Status,Condition,Remarks"];
    const rows = data.map(item => [
        item.id, `"${item.name.replace(/"/g, '""')}"`, item.controlId, item.quantity, 
        `"${item.location}"`, `"${item.supplier}"`, item.stock, item.condition, `"${item.remarks.replace(/"/g, '""')}"`
    ].join(","));
    
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Inventory_List.csv";
    link.click();
    setIsExportOpen(false);
  };

  // --- POPUP ---
  const { showConfirm } = usePopup();

  // --- BATCH & STANDARD HANDLERS ---
  const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === currentItems.length && currentItems.length > 0 ? [] : currentItems.map(i => i.id));
  const handleBatchDelete = async () => { 
    const confirmed = await showConfirm({ title: "Delete Items", message: `Are you sure you want to delete ${selectedIds.length} item(s)? This action cannot be undone.`, variant: "danger", confirmText: "Delete", cancelText: "Cancel" });
    if (confirmed) { await deleteItems(selectedIds); setSelectedIds([]); } 
  };
  const handleBatchStatusUpdate = async (newStock: any) => { await updateItems(selectedIds, { stock: newStock }); setSelectedIds([]); };
  const handleBatchConditionUpdate = async (newCondition: any) => { await updateItems(selectedIds, { condition: newCondition }); setSelectedIds([]); };
  const handleDelete = async (id: number) => { 
    const confirmed = await showConfirm({ title: "Delete Item", message: "Are you sure you want to delete this item? This action cannot be undone.", variant: "danger", confirmText: "Delete", cancelText: "Cancel" });
    if (confirmed) deleteItem(id); 
  };
  
  const openAddModal = () => { 
    setIsEditing(false); 
    setCurrentId(null); 
    // Auto-set location for lab-restricted users
    const defaultLocation = isLabRestricted && userLabDbName ? userLabDbName : "";
    setNewItem({ name: "", controlId: "", quantity: 0, location: defaultLocation, supplier: "", stock: "In Stock", condition: "Available", remarks: "" }); 
    setIsModalOpen(true); 
  };
  const openEditModal = (item: Item) => { setIsEditing(true); setCurrentId(item.id); setNewItem({ ...item } as any); setIsModalOpen(true); };
  const handleSaveItem = (e: React.FormEvent) => { e.preventDefault(); const calculatedStock = newItem.quantity === 0 ? "Out of Stock" : (newItem.quantity <= 5 ? "Low Stock" : "In Stock"); const itemToSave = { ...newItem, stock: calculatedStock }; isEditing && currentId !== null ? updateItem(currentId, itemToSave as any) : addItem(itemToSave as any); setIsModalOpen(false); };

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-20">
      
      {/* --- HEADER SECTION (Export Button Moved Here) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
          <p className="text-gray-400 mt-1">Manage and track equipment across all laboratories.</p>
        </div>

        {/* MOVED EXPORT BUTTON */}
        <div className="relative z-100" data-tour="export-btn">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-black/20">
              <Download size={16} /> Export Data <ChevronDown size={14}/>
            </button>
            <AnimatePresence>
              {isExportOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-12 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 w-48 overflow-hidden ring-1 ring-white/5">
                      <button onClick={exportPDF} className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-colors border-b border-white/5">Export as PDF</button>
                      <button onClick={exportExcel} className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-colors border-b border-white/5">Export as Excel</button>
                      <button onClick={exportCSV} className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-colors">Export as CSV</button>
                  </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>

      {/* --- CONTROL BAR --- */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 p-3 md:p-4 rounded-2xl flex flex-col gap-4 w-full shadow-lg">
        {/* Row 1: Add Button & Search */}
        <div className="flex items-center gap-3 w-full">
           <button onClick={openAddModal} data-tour="add-item-btn" className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap shrink-0">
            <Plus size={16} /> Add Item
          </button>
          
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-500" />
          </div>
        </div>

        {/* Row 2: Lab Tabs & Filters in same row on desktop */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Lab Tabs - Scrollable */}
          <div className="overflow-x-auto no-scrollbar -mx-3 px-3 md:mx-0 md:px-0" data-tour="filter-tabs">
              <div className="flex items-center gap-1.5 min-w-max">
                  {isLabRestricted ? (
                    // Show only user's assigned lab with lock icon
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black border border-white">
                      <Lock size={12} />
                      <span>{userLabTab}</span>
                    </div>
                  ) : (
                    LAB_TABS.map((lab) => (
                      <button key={lab} onClick={() => {setSelectedLab(lab); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${selectedLab === lab ? "bg-white text-black border-white" : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"}`}>{lab}</button>
                    ))
                  )}
              </div>
          </div>

          {/* Filters - Row on desktop */}
          <div className="flex items-center gap-2 shrink-0">
               {/* Status Dropdown */}
               <div className="relative" ref={statusDropdownRef}>
                 <button 
                   onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setConditionDropdownOpen(false); setSortDropdownOpen(false); }}
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
                       className="absolute top-full left-0 mt-2 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                     >
                       {[
                         { value: "All", label: "All Status" },
                         { value: "Critical", label: "Critical" },
                         { value: "In Stock", label: "In Stock" },
                         { value: "Low Stock", label: "Low Stock" },
                         { value: "Out of Stock", label: "Out of Stock" }
                       ].map((option) => (
                         <button
                           key={option.value}
                           onClick={() => { setFilterStatus(option.value); setCurrentPage(1); setStatusDropdownOpen(false); }}
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

               {/* Condition Dropdown */}
               <div className="relative" ref={conditionDropdownRef}>
                 <button 
                   onClick={() => { setConditionDropdownOpen(!conditionDropdownOpen); setStatusDropdownOpen(false); setSortDropdownOpen(false); }}
                   className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                 >
                   <Wrench size={14} className="text-gray-500" />
                   <span className="text-white text-xs font-medium">{filterCondition === "All" ? "All Cond." : filterCondition}</span>
                   <ChevronDown size={14} className={`text-gray-500 transition-transform ${conditionDropdownOpen ? 'rotate-180' : ''}`} />
                 </button>
                 <AnimatePresence>
                   {conditionDropdownOpen && (
                     <motion.div 
                       initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                       animate={{ opacity: 1, y: 0, scale: 1 }} 
                       exit={{ opacity: 0, y: 8, scale: 0.96 }}
                       transition={{ duration: 0.15 }}
                       className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                     >
                       {[
                         { value: "All", label: "All Cond." },
                         { value: "Available", label: "Available" },
                         { value: "Broken", label: "Broken" },
                         { value: "For Repairs", label: "For Repairs" }
                       ].map((option) => (
                         <button
                           key={option.value}
                           onClick={() => { setFilterCondition(option.value); setCurrentPage(1); setConditionDropdownOpen(false); }}
                           className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                             filterCondition === option.value 
                               ? 'bg-indigo-500/20 text-indigo-400' 
                               : 'text-gray-300 hover:bg-white/5 hover:text-white'
                           }`}
                         >
                           {option.label}
                           {filterCondition === option.value && <CheckCircle size={14} />}
                         </button>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>

               {/* Sort Dropdown */}
               <div className="relative" ref={sortDropdownRef}>
                 <button 
                   onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setStatusDropdownOpen(false); setConditionDropdownOpen(false); }}
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
                       className="absolute top-full right-0 mt-2 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                     >
                       {["Newest", "Name (A-Z)", "Qty (High)", "Qty (Low)"].map((option) => (
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
        </div>
      </div>

      {/* TABLE - Desktop View */}
      <div className="hidden md:flex bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                <th className="p-4 w-[50px] text-center"><button onClick={toggleSelectAll} className="hover:text-white transition-colors">{selectedIds.length > 0 && selectedIds.length === currentItems.length ? <CheckSquare size={16}/> : <Square size={16}/>}</button></th>
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
                currentItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} className={`group transition-colors ${isSelected ? "bg-indigo-500/10" : "hover:bg-white/[0.07]"}`}>
                      <td className="p-4 text-center"><button onClick={() => toggleSelect(item.id)} className={`transition-colors ${isSelected ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"}`}>{isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}</button></td>
                      <td className="p-4"><div className="font-bold text-white text-sm">{item.name}</div><div className="text-xs text-gray-500 mt-0.5">{item.supplier}</div></td>
                      <td className="p-4"><div className="flex items-center gap-1.5 bg-white/5 w-fit px-2 py-1 rounded border border-white/5"><Hash size={10} className="text-gray-500" /><span className="text-gray-300 font-mono text-xs">{item.controlId}</span></div></td>
                      <td className="p-4 text-center"><div className="inline-flex flex-col items-center justify-center bg-white/5 border border-white/10 w-12 h-10 rounded-lg"><span className={`text-sm font-bold ${item.quantity === 0 ? "text-red-400" : "text-white"}`}>{item.quantity < 10 && item.quantity > 0 ? `0${item.quantity}` : item.quantity}</span></div></td>
                      <td className="p-4"><div className="flex items-center gap-2 text-gray-300"><div className="bg-indigo-500/10 p-1.5 rounded-md text-indigo-400"><MapPin size={12} /></div><span className="text-xs font-medium">{item.location}</span></div></td>
                      <td className="p-4"><StockBadge status={item.stock} /></td>
                      <td className="p-4"><ConditionBadge status={item.condition} /></td>
                      <td className="p-4"><span className="text-gray-400 text-xs truncate block max-w-[140px]" title={item.remarks}>{item.remarks}</span></td>
                      <td className="p-4 text-right"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(item)} className="p-2 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white"><Edit2 size={14} /></button><button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"><Trash2 size={14} /></button></div></td>
                    </tr>
                  )
                })
              ) : (<tr><td colSpan={9} className="p-8 text-center text-gray-500 text-sm">No items found matching filters.</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-auto p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <span>Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} items</span>
          <div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30">Previous</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30">Next</button></div>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden flex-1 flex flex-col">
        {/* Mobile Select All & Count */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            {selectedIds.length > 0 && selectedIds.length === currentItems.length ? <CheckSquare size={16} className="text-indigo-400"/> : <Square size={16}/>}
            <span>Select All</span>
          </button>
          <span className="text-xs text-gray-500">{totalItems} items</span>
        </div>

        {/* Cards Container */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {currentItems.length > 0 ? (
            currentItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${isSelected ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10"}`}
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <button 
                      onClick={() => toggleSelect(item.id)} 
                      className={`mt-0.5 transition-colors ${isSelected ? "text-indigo-400" : "text-gray-600"}`}
                    >
                      {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{item.supplier || "No supplier"}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditModal(item)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body - Grid Info */}
                  <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                    {/* Control ID */}
                    <div className="flex items-center gap-2">
                      <div className="bg-white/5 p-1.5 rounded text-gray-500">
                        <Hash size={12} />
                      </div>
                      <span className="text-xs text-gray-300 font-mono truncate">{item.controlId}</span>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <div className={`bg-white/5 border border-white/10 px-2 py-1 rounded text-center min-w-[40px] ${item.quantity === 0 ? "text-red-400" : "text-white"}`}>
                        <span className="text-sm font-bold">{item.quantity}</span>
                      </div>
                      <span className="text-xs text-gray-500">qty</span>
                    </div>

                    {/* Location */}
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="bg-indigo-500/10 p-1.5 rounded text-indigo-400">
                        <MapPin size={12} />
                      </div>
                      <span className="text-xs text-gray-300 truncate">{item.location}</span>
                    </div>
                  </div>

                  {/* Card Footer - Status & Condition */}
                  <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StockBadge status={item.stock} />
                      <ConditionBadge status={item.condition} />
                    </div>
                    {item.remarks && (
                      <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={item.remarks}>
                        {item.remarks}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-gray-500 text-sm">No items found matching filters.</p>
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-gray-500">
          <span>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 text-gray-400"
            >
              Prev
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages || totalPages === 0} 
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 text-gray-400"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* BATCH ACTIONS BAR - Desktop */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
            <>
              {/* Desktop Batch Bar */}
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-xl px-6 py-3 items-center gap-6">
                  <div className="flex items-center gap-3 border-r border-white/10 pr-6"><span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">{selectedIds.length}</span><span className="text-sm text-gray-300 font-medium">Items Selected</span></div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => handleBatchStatusUpdate("In Stock")} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs font-medium text-emerald-400 border border-transparent hover:border-white/10">In Stock</button>
                      <button onClick={() => handleBatchStatusUpdate("Low Stock")} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs font-medium text-amber-400 border border-transparent hover:border-white/10">Low Stock</button>
                      <button onClick={() => handleBatchStatusUpdate("Out of Stock")} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs font-medium text-rose-400 border border-transparent hover:border-white/10">Out of Stock</button>
                      <div className="w-px h-4 bg-white/10 mx-1"></div>
                      <div className="relative">
                         <select onChange={(e) => handleBatchConditionUpdate(e.target.value as any)} value="" className="appearance-none bg-transparent hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium py-1.5 pl-3 pr-8 rounded-lg cursor-pointer border border-transparent hover:border-white/10 outline-none">
                             <option value="" disabled>Set Condition</option><option value="Available" className="bg-gray-900">Mark Available</option><option value="Broken" className="bg-gray-900">Mark Broken</option><option value="For Repairs" className="bg-gray-900">Mark For Repairs</option>
                         </select>
                         <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                      </div>
                      <div className="w-px h-4 bg-white/10 mx-1"></div>
                      <button onClick={handleBatchDelete} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/20 transition-colors"><Trash2 size={14}/> Delete</button>
                  </div>
                  <button onClick={() => setSelectedIds([])} className="absolute -top-2 -right-2 bg-gray-800 text-gray-400 rounded-full p-1 border border-white/10 hover:text-white"><X size={12}/></button>
              </motion.div>

              {/* Mobile Batch Bar */}
              <motion.div 
                initial={{ y: 100, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 100, opacity: 0 }} 
                className="md:hidden fixed bottom-20 left-3 right-3 z-40 bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-xl p-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">{selectedIds.length}</span>
                    <span className="text-xs text-gray-300 font-medium">Selected</span>
                  </div>
                  <button onClick={() => setSelectedIds([])} className="text-gray-400 hover:text-white p-1">
                    <X size={16}/>
                  </button>
                </div>

                {/* Status Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button onClick={() => handleBatchStatusUpdate("In Stock")} className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-[10px] font-medium text-emerald-400 border border-emerald-500/20 transition-colors">In Stock</button>
                  <button onClick={() => handleBatchStatusUpdate("Low Stock")} className="py-2 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg text-[10px] font-medium text-amber-400 border border-amber-500/20 transition-colors">Low Stock</button>
                  <button onClick={() => handleBatchStatusUpdate("Out of Stock")} className="py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-[10px] font-medium text-rose-400 border border-rose-500/20 transition-colors">Out of Stock</button>
                </div>

                {/* Condition & Delete Row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select 
                      onChange={(e) => handleBatchConditionUpdate(e.target.value as any)} 
                      value="" 
                      className="w-full appearance-none bg-white/5 text-gray-300 text-xs font-medium py-2 px-3 pr-8 rounded-lg cursor-pointer border border-white/10 outline-none"
                    >
                      <option value="" disabled>Set Condition...</option>
                      <option value="Available" className="bg-gray-900">Available</option>
                      <option value="Broken" className="bg-gray-900">Broken</option>
                      <option value="For Repairs" className="bg-gray-900">For Repairs</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                  </div>
                  <button 
                    onClick={handleBatchDelete} 
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/20 transition-colors"
                  >
                    <Trash2 size={14}/> Delete
                  </button>
                </div>
              </motion.div>
            </>
        )}
      </AnimatePresence>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
               <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5"><h2 className="text-lg font-bold text-white">{isEditing ? "Edit Item" : "Add New Item"}</h2><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
               <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase">Item Name</label>
                      <input required type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase">Control ID</label>
                      <input required type="text" value={newItem.controlId} onChange={(e) => setNewItem({...newItem, controlId: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase">Quantity</label>
                      <input required type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-medium text-gray-400 uppercase flex items-center gap-1.5">Location {isLabRestricted && <Lock size={10} className="text-gray-500" />}</label>
                      {isLabRestricted ? (
                        <div className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400 flex items-center gap-2"><Lock size={12} />{userLabTab}</div>
                      ) : (
                        <div className="relative" ref={modalLocationRef}>
                          <button 
                            type="button"
                            onClick={() => { setModalLocationOpen(!modalLocationOpen); setModalConditionOpen(false); }}
                            className="w-full flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:border-white/20 transition-colors"
                          >
                            <span className={newItem.location ? "text-white" : "text-gray-500"}>{newItem.location ? LAB_TABS.find(lab => LAB_MAPPING[lab] === newItem.location) || newItem.location : "Select Laboratory"}</span>
                            <ChevronDown size={14} className={`text-gray-500 transition-transform ${modalLocationOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {modalLocationOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                                animate={{ opacity: 1, y: 0, scale: 1 }} 
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                              >
                                {LAB_TABS.filter(lab => lab !== "All Labs").map((lab) => (
                                  <button
                                    key={lab}
                                    type="button"
                                    onClick={() => { setNewItem({...newItem, location: LAB_MAPPING[lab]}); setModalLocationOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                                      newItem.location === LAB_MAPPING[lab] 
                                        ? 'bg-indigo-500/20 text-indigo-400' 
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    {lab}
                                    {newItem.location === LAB_MAPPING[lab] && <CheckCircle size={14} />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase">Supplier</label>
                      <input type="text" value={newItem.supplier} onChange={(e) => setNewItem({...newItem, supplier: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase">Condition</label>
                      <div className="relative" ref={modalConditionRef}>
                        <button 
                          type="button"
                          onClick={() => { setModalConditionOpen(!modalConditionOpen); setModalLocationOpen(false); }}
                          className="w-full flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:border-white/20 transition-colors"
                        >
                          <span>{newItem.condition}</span>
                          <ChevronDown size={14} className={`text-gray-500 transition-transform ${modalConditionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {modalConditionOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                              animate={{ opacity: 1, y: 0, scale: 1 }} 
                              exit={{ opacity: 0, y: 8, scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                            >
                              {["Available", "Broken", "For Repairs"].map((condition) => (
                                <button
                                  key={condition}
                                  type="button"
                                  onClick={() => { setNewItem({...newItem, condition}); setModalConditionOpen(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                                    newItem.condition === condition 
                                      ? 'bg-indigo-500/20 text-indigo-400' 
                                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  {condition}
                                  {newItem.condition === condition && <CheckCircle size={14} />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase">Remarks</label>
                    <div className="relative">
                      <textarea rows={2} value={newItem.remarks} onChange={(e) => setNewItem({...newItem, remarks: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white resize-none"/>
                      {newItem.remarks && <button type="button" onClick={() => setNewItem({...newItem, remarks: ""})} className="absolute right-2 top-2 text-gray-500 hover:text-white transition-colors"><X size={16} /></button>}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">Cancel</button>
                    <button type="submit" className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"><Save size={16} />{isEditing ? "Update Item" : "Save Item"}</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper to prevent "useSearchParams()" suspense error during build
export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading inventory...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

function StockBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { "In Stock": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", "Low Stock": "bg-amber-500/10 text-amber-400 border-amber-500/20", "Out of Stock": "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  const icons: Record<string, React.ReactNode> = { "In Stock": <CheckCircle size={10} className="mr-1.5" />, "Low Stock": <AlertCircle size={10} className="mr-1.5" />, "Out of Stock": <XCircle size={10} className="mr-1.5" /> };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${styles[status]}`}>{icons[status]}{status}</span>;
}

function ConditionBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { "Available": "text-gray-400 bg-white/5 border-white/10", "Broken": "text-rose-400 bg-rose-950/30 border-rose-500/20", "For Repairs": "text-amber-400 bg-amber-950/30 border-amber-500/20" };
  return <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium border ${styles[status]}`}>{status}</span>;
}