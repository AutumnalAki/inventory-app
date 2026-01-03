"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { 
  Plus, Filter, Edit2, Trash2, ChevronDown, ArrowUpDown, CheckCircle, AlertCircle, XCircle, 
  MapPin, Hash, MoreHorizontal, X, Save, Search, Wrench, Download, CheckSquare, Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation"; 
import { useInventory, Item } from "@/context/InventoryContext";

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
  "ECE Lab": "ECE Laboratory"
};
const LAB_TABS = Object.keys(LAB_MAPPING);

function InventoryContent() {
  const { inventory, addItem, updateItem, deleteItem, deleteItems, updateItems } = useInventory();
  const searchParams = useSearchParams();

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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", controlId: "", quantity: 0, location: "", supplier: "", stock: "In Stock", condition: "Available", remarks: ""
  });

  // URL Params and Filtering Logic
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const conditionParam = searchParams.get("condition");
    if (statusParam) setFilterStatus(statusParam);
    if (conditionParam) setFilterCondition(conditionParam);
  }, [searchParams]);

  const processedData = useMemo(() => {
    let data = [...inventory];
    if (selectedLab !== "All Labs") {
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
      if (sortOption === "Newest") return b.id - a.id;
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

  // --- BATCH & STANDARD HANDLERS ---
  const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === currentItems.length && currentItems.length > 0 ? [] : currentItems.map(i => i.id));
  const handleBatchDelete = async () => { if (confirm(`Delete ${selectedIds.length} items?`)) { await deleteItems(selectedIds); setSelectedIds([]); } };
  const handleBatchStatusUpdate = async (newStock: any) => { await updateItems(selectedIds, { stock: newStock }); setSelectedIds([]); };
  const handleBatchConditionUpdate = async (newCondition: any) => { await updateItems(selectedIds, { condition: newCondition }); setSelectedIds([]); };
  const handleDelete = (id: number) => confirm("Delete this item?") && deleteItem(id);
  
  const openAddModal = () => { setIsEditing(false); setCurrentId(null); setNewItem({ name: "", controlId: "", quantity: 0, location: "", supplier: "", stock: "In Stock", condition: "Available", remarks: "" }); setIsModalOpen(true); };
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
        <div className="relative z-30">
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

      {/* --- CONTROL BAR (Removed Export Button) --- */}
      <div className="relative z-20 bg-white/5 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xl flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
           <button onClick={openAddModal} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap">
            <Plus size={16} /> Add Item
          </button>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
        </div>

        {/* ... Filters ... */}
        <div className="flex-1 overflow-x-auto no-scrollbar mask-linear-fade flex justify-center w-full">
            <div className="flex items-center gap-1 min-w-max px-2">
                {LAB_TABS.map((lab) => (
                <button key={lab} onClick={() => {setSelectedLab(lab); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${selectedLab === lab ? "bg-white text-black border-white" : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"}`}>{lab}</button>
                ))}
            </div>
        </div>
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-end gap-2 w-full xl:w-auto shrink-0">
             <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex-1 xl:flex-none"><Filter size={14} className="text-gray-500" /><div className="relative"><select value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value); setCurrentPage(1);}} className="appearance-none bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pl-2 pr-6 w-full xl:w-24"><option className="bg-gray-900" value="All">Status: All</option><option className="bg-gray-900" value="Critical">Critical</option><option className="bg-gray-900" value="In Stock">In Stock</option><option className="bg-gray-900" value="Low Stock">Low Stock</option><option className="bg-gray-900" value="Out of Stock">Out of Stock</option></select></div></div>
             <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex-1 xl:flex-none"><Wrench size={14} className="text-gray-500" /><div className="relative"><select value={filterCondition} onChange={(e) => {setFilterCondition(e.target.value); setCurrentPage(1);}} className="appearance-none bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pl-2 pr-6 w-full xl:w-28"><option className="bg-gray-900" value="All">Condition: All</option><option className="bg-gray-900" value="Available">Available</option><option className="bg-gray-900" value="Broken">Broken</option><option className="bg-gray-900" value="For Repairs">For Repairs</option></select></div></div>
             <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex-1 xl:flex-none"><ArrowUpDown size={14} className="text-gray-500" /><div className="relative"><select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="appearance-none bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pl-2 pr-6 w-full xl:w-28"><option className="bg-gray-900">Newest</option><option className="bg-gray-900">Name (A-Z)</option><option className="bg-gray-900">Qty (High)</option><option className="bg-gray-900">Qty (Low)</option></select></div></div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex flex-col">
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

      {/* BATCH ACTIONS BAR */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-xl px-6 py-3 flex items-center gap-6">
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
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Item Name</label><input required type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Control ID</label><input required type="text" value={newItem.controlId} onChange={(e) => setNewItem({...newItem, controlId: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" /></div></div>
                  <div className="grid grid-cols-3 gap-4"><div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Quantity</label><input required type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" /></div><div className="space-y-1.5 col-span-2"><label className="text-xs font-medium text-gray-400 uppercase">Location</label><div className="relative"><select required value={newItem.location} onChange={(e) => setNewItem({...newItem, location: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none"><option value="" disabled>Select Laboratory</option>{LAB_TABS.filter(lab => lab !== "All Labs").map((lab) => (<option key={lab} value={LAB_MAPPING[lab]} className="bg-gray-900">{lab}</option>))}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} /></div></div></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Supplier</label><input type="text" value={newItem.supplier} onChange={(e) => setNewItem({...newItem, supplier: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Condition</label><div className="relative"><select value={newItem.condition} onChange={(e) => setNewItem({...newItem, condition: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none"><option className="bg-gray-900">Available</option><option className="bg-gray-900">Broken</option><option className="bg-gray-900">For Repairs</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} /></div></div></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Remarks</label><textarea rows={2} value={newItem.remarks} onChange={(e) => setNewItem({...newItem, remarks: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"/></div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">Cancel</button><button type="submit" className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"><Save size={16} />{isEditing ? "Update Item" : "Save Item"}</button></div>
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