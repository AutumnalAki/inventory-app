"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useInventory } from "@/context/InventoryContext";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Icons } from "@/constants/icons";

// === LOGO ===
const LOGO_URL = "/favicon.ico";

// === TYPES ===
interface RequisitionItem {
  name: string;
  quantity: number;
  unit: string;
  dateOut?: string;
  dateIn?: string;
}

interface RequisitionForm {
  id: string;
  studentName: string;
  studentNumber: string;
  purpose: string;
  instructor: string;
  programSection: string;
  courseCode: string;
  room: string;
  timeOfUse: string;
  items: RequisitionItem[];
  status: "Reserved" | "Approved" | "Released" | "Completed" | "Cancelled";
  dateOut: string;
  dateIn: string | null;
  createdAt?: string;
}

// === HELPER: DetailInput ===
const DetailInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="flex items-stretch h-full min-h-[2.25rem] border-b-2 border-black last:border-b-0 bg-white hover:bg-orange-50/30 transition-colors">
    <div className="w-32 shrink-0 flex items-center px-3 font-bold border-r-2 border-black">
      <span className="text-[9px] sm:text-xs leading-tight text-black">{label}</span>
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 px-3 py-1 bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black placeholder:text-gray-400 placeholder:italic focus:bg-orange-50/50"
    />
  </div>
);

// === HELPER: SignatureBlock ===
const SignatureBlock: React.FC<{ label: string; title: string; name?: string; signatureName?: string; onSignatureChange?: (v: string) => void }> = ({ label, title, name, signatureName, onSignatureChange }) => (
  <div className="border-r-2 border-black last:border-r-0 p-2 text-center border-t-2 flex flex-col">
    <div className="flex-1 border-b-2 border-black mb-1 min-h-[2.5rem]"></div>
    <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tight text-black">{title}</p>
    <p className="text-[7px] sm:text-[8px] font-normal text-black">{label}</p>
    {name && <p className="text-[7px] sm:text-[8px] font-bold text-black">{name}</p>}
    {signatureName !== undefined && onSignatureChange && (
      <input
        type="text"
        value={signatureName}
        onChange={(e) => onSignatureChange(e.target.value)}
        placeholder="___________"
        className="text-[7px] sm:text-[8px] text-center text-black bg-transparent outline-none w-full mt-1 placeholder:text-gray-400"
      />
    )}
  </div>
);

export default function RequisitionFormTestingPage() {
  const router = useRouter();
  const { inventory: inventoryItems, refreshData } = useInventory();
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Partial<RequisitionForm>>({
    studentName: "",
    studentNumber: "",
    purpose: "",
    instructor: "",
    programSection: "",
    courseCode: "",
    room: "",
    timeOfUse: "",
    items: Array(18).fill({ name: "", quantity: 0, unit: "", dateOut: "", dateIn: "" }),
  });
  const [signatures, setSignatures] = useState({
    requestedBy: "",
    endorsedBy: "",
    releasedBy: "",
    approvedBy: "",
  });

  const availableInventory = useMemo(() => {
    const agg = new Map<string, any>();
    inventoryItems.forEach((item) => {
      const key = item.name.toLowerCase().trim();
      agg.set(key, { ...item });
    });
    return Array.from(agg.values());
  }, [inventoryItems]);

  useEffect(() => {
    refreshData();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveSuggestionRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [refreshData]);

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const showSuggestions = (index: number, val: string, items?: any[]) => {
    const itemsToUse = items || [...(form.items || [])];
    const otherNames = itemsToUse
      .filter((_, i) => i !== index)
      .map((it) => it.name.toLowerCase().trim())
      .filter((n) => n !== "");

    const filtered = availableInventory
      .filter(
        (item) =>
          !otherNames.includes(item.name.toLowerCase().trim()) &&
          item.name.toLowerCase().includes(val.trim().toLowerCase()) &&
          item.quantity > 0
      )
      .map((item) => ({ ...item, isAvailable: item.quantity > 0 }));

    setFilteredSuggestions(filtered);
    setActiveSuggestionRow(index);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...(form.items || [])];
    let itemValue: string | number = value;

    if (field === "quantity") {
      const parsed = parseInt(value as string, 10);
      itemValue = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      newItems[index].unit = Number(itemValue) <= 1 ? "pc" : "pcs";
    }

    if (field === "name" && String(value).trim() === "") {
      newItems[index] = { name: "", quantity: 0, unit: "", dateOut: "", dateIn: "" };
    } else {
      newItems[index] = { ...newItems[index], [field]: itemValue };
    }

    setForm((prev) => ({ ...prev, items: newItems }));

    if ((field === "name" || field === "quantity") && String(value).trim()) {
      const val = field === "name" ? String(value) : newItems[index].name;
      if (val.trim()) showSuggestions(index, val, newItems);
    }
  };

  const selectSuggestion = (index: number, suggestion: any) => {
    if (!suggestion.isAvailable) return;
    const newItems = [...(form.items || [])];
    const qty = Number(newItems[index].quantity) || 1;
    newItems[index] = {
      name: suggestion.name,
      quantity: qty,
      unit: qty <= 1 ? "pc" : "pcs",
      dateOut: "",
      dateIn: "",
    };
    setForm((prev) => ({ ...prev, items: newItems }));
    setActiveSuggestionRow(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!formRef.current) return;
    try {
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Requisition-${form.studentNumber || "Form"}.pdf`);
    } catch (error) {
      setErrorMsg("Failed to generate PDF.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const checks = [
      [form.studentName?.trim(), "Student Name"],
      [form.studentNumber?.trim(), "Student Number"],
      [form.purpose?.trim(), "Purpose"],
      [form.instructor?.trim(), "Instructor"],
      [form.programSection?.trim(), "Program & Section"],
      [form.courseCode?.trim(), "Course Code"],
      [form.room?.trim(), "Room"],
    ];

    for (const [value, label] of checks) {
      if (!value) {
        setErrorMsg(`Please enter the ${label}.`);
        return;
      }
    }

    const rawItems = (form.items || []).filter((i) => i.name.trim() !== "" && i.quantity > 0);
    if (rawItems.length === 0) {
      setErrorMsg("Please add at least one equipment item.");
      return;
    }

    setIsSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const id = `REQ-${year}-${random}`;

      const { error, data } = await supabase.from("requisitions").insert([
        {
          id,
          student_name: form.studentName,
          student_number: form.studentNumber,
          purpose: form.purpose,
          instructor: form.instructor,
          program_section: form.programSection,
          course_code: form.courseCode,
          room: form.room,
          time_of_use: form.timeOfUse,
          items: rawItems,
          status: "Reserved",
          date_out: new Date().toISOString(),
          date_in: null,
          created_at: new Date().toISOString(),
          signatures: signatures,
        },
      ]
      ).select();

      if (error) {
        console.error("Database error:", error);
        throw new Error(error.message || "Failed to submit requisition. Please ensure the form is complete and try again.");
      }
      console.log("Requisition saved:", data);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Submit error:", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const PrintIcon = Icons.print;
  const DownloadIcon = Icons.download;
  const CloseIcon = Icons.close;
  const AlertIcon = Icons.alert;
  const CheckIcon = Icons.check;

  return (
    <div className="min-h-screen bg-black/50 py-4 px-3 sm:px-6">
      <style>{`@media print { body { background: white; } .no-print { display: none !important; } .bg-black\/50 { background: white !important; } }`}</style>

      {/* Toolbar */}
      <div className="max-w-4xl mx-auto mb-4 flex gap-2 justify-between items-center no-print">
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-stone-700 hover:bg-stone-800 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
            <PrintIcon size={16} />
            Print
          </button>
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-stone-600 hover:bg-stone-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
            <DownloadIcon size={16} />
            PDF
          </button>
        </div>
        <button onClick={() => router.back()} className="flex items-center gap-2 bg-stone-300 hover:bg-stone-400 text-stone-700 font-bold py-2 px-4 rounded-lg text-sm">
          <CloseIcon size={16} />
          Cancel
        </button>
      </div>

      {/* Glass Container with Form */}
      <div className="max-w-4xl mx-auto backdrop-blur-md bg-black/40 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20 no-print">
        {/* Form Paper */}
        <div ref={formRef} className="bg-white rounded-lg shadow-xl" style={{ aspectRatio: '8.5/11' }}>
          <form onSubmit={handleSubmit} className="border-4 border-black h-full flex flex-col overflow-auto">
          {/* Header */}
          <div className="border-b-4 border-black p-4 sm:p-6 flex justify-between gap-4 items-start">
            <div className="flex gap-4 flex-1">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center">
                <img src={LOGO_URL} alt="CDM Logo" className="w-16 sm:w-20 h-16 sm:h-20" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-base sm:text-xl font-bold uppercase tracking-tight text-black">Colegio de Muntinlupa</h1>
                <h2 className="text-lg sm:text-2xl font-black uppercase text-black">Requisition Form</h2>
                <p className="text-[10px] sm:text-xs font-bold uppercase text-black">Equipment, Supplies and Apparatus</p>
              </div>
            </div>

            {/* Document Code */}
            <div className="border-2 border-black text-[10px] w-56 flex-shrink-0">
              <div className="bg-black text-white p-1 font-bold text-center border-b-2 border-black uppercase">Document Code</div>
              <div className="grid grid-cols-3 text-[9px] font-bold text-black">
                <div className="border-r-2 border-b-2 border-black p-1 text-center"><span className="text-[8px] text-black">Effective Date</span></div>
                <div className="border-r-2 border-b-2 border-black p-1 text-center"><span className="text-[8px] text-black">Revision No.</span><div className="text-black">00</div></div>
                <div className="border-b-2 border-black p-1 text-center"><span className="text-[8px] text-black">Revision Date</span></div>
              </div>
              <div className="border-t-2 border-black p-1 text-center bg-yellow-50 text-[10px] font-mono font-bold text-black">AUTOGEN-DLI-SUBMIT</div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 border-b-4 border-black">
            <div className="border-r-4 border-black flex flex-col">
              <DetailInput label="Name:" value={form.studentName || ""} onChange={(v) => handleFieldChange("studentName", v)} placeholder="Surname, Firstname M.I." />
              <DetailInput label="Student No.:" value={form.studentNumber || ""} onChange={(v) => handleFieldChange("studentNumber", v)} placeholder="Enter student number" />
              <DetailInput label="Purpose:" value={form.purpose || ""} onChange={(v) => handleFieldChange("purpose", v)} placeholder="Enter purpose" />
              <DetailInput label="Instructor:" value={form.instructor || ""} onChange={(v) => handleFieldChange("instructor", v)} placeholder="Enter instructor" />
            </div>
            <div className="flex flex-col">
              <DetailInput label="Program & Section:" value={form.programSection || ""} onChange={(v) => handleFieldChange("programSection", v)} placeholder="Enter program/section" />
              <DetailInput label="Course/Code:" value={form.courseCode || ""} onChange={(v) => handleFieldChange("courseCode", v)} placeholder="Enter course/code" />
              <DetailInput label="Room:" value={form.room || ""} onChange={(v) => handleFieldChange("room", v)} placeholder="Enter room" />
              <div className="flex items-stretch h-full min-h-[2.25rem] border-b-2 border-black bg-white hover:bg-orange-50/30">
                <div className="w-32 shrink-0 flex items-center px-3 font-bold border-r-2 border-black">
                  <span className="text-[9px] sm:text-xs text-black">Time of use:</span>
                </div>
                <input type="text" value={form.timeOfUse || ""} onChange={(e) => handleFieldChange("timeOfUse", e.target.value)} placeholder="Start to End" className="flex-1 px-3 py-1 bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black placeholder:text-gray-400 placeholder:italic focus:bg-orange-50/50" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full border-b-4 border-black">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="text-center text-[9px] sm:text-xs font-bold bg-stone-200 border-b-2 border-black text-black">
                  <th className="border-r-2 border-black py-2 px-1 w-[45%] text-black">Equipment/Supplies/Apparatus</th>
                  <th className="border-r-2 border-black py-2 px-1 w-[12%] text-black">Quantity</th>
                  <th className="border-r-2 border-black py-2 px-1 w-[10%] text-black">Unit</th>
                  <th className="border-r-2 border-black py-2 px-1 w-[16%] text-black">Date and Time Out</th>
                  <th className="py-2 px-1 w-[17%] text-black">Date and Time In</th>
                </tr>
              </thead>
              <tbody>
                {(form.items || []).map((item, idx) => (
                  <tr key={idx} className="text-[9px] sm:text-xs border-b-2 border-black hover:bg-orange-50/20 text-black">
                    <td className="border-r-2 border-black p-1 relative">
                      <input type="text" value={item.name} onChange={(e) => handleItemChange(idx, "name", e.target.value)} onFocus={() => item.name && showSuggestions(idx, item.name)} placeholder={idx === 0 ? "Search items..." : ""} className="w-full bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black placeholder:text-gray-400 focus:bg-orange-50 px-1" />
                      <AnimatePresence>
                        {activeSuggestionRow === idx && filteredSuggestions.length > 0 && (
                          <motion.div ref={dropdownRef} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 right-0 bg-white border-2 border-orange-500 shadow-xl z-50 max-h-40 overflow-y-auto">
                            {filteredSuggestions.slice(0, 5).map((sug, i) => (
                              <button key={i} type="button" onClick={() => selectSuggestion(idx, sug)} className="w-full text-left px-2 py-2 hover:bg-orange-100 border-b border-gray-200 text-[9px]">
                                <div className="flex justify-between">
                                  <span className="font-semibold">{sug.name}</span>
                                  <span className="text-gray-500 text-[8px]">Qty: {sug.quantity}</span>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                    <td className="border-r-2 border-black p-1 text-center">
                      <input type="number" min="0" value={item.quantity || 0} onChange={(e) => handleItemChange(idx, "quantity", e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] sm:text-xs text-black focus:bg-orange-50" />
                    </td>
                    <td className="border-r-2 border-black p-1 text-center">
                      <select value={item.unit || "pcs"} onChange={(e) => handleItemChange(idx, "unit", e.target.value)} className="w-full bg-transparent outline-none text-[10px] sm:text-xs text-black focus:bg-orange-50">
                        <option value="pc">pc</option>
                        <option value="pcs">pcs</option>
                        <option value="set">set</option>
                        <option value="box">box</option>
                      </select>
                    </td>
                    <td className="border-r-2 border-black p-1 text-center">
                      <input type="datetime-local" value={item.dateOut || ""} onChange={(e) => handleItemChange(idx, "dateOut", e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] sm:text-xs text-black focus:bg-orange-50 cursor-pointer" />
                    </td>
                    <td className="p-1 text-center">
                      <input type="datetime-local" value={item.dateIn || ""} onChange={(e) => handleItemChange(idx, "dateIn", e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] sm:text-xs text-black focus:bg-orange-50 cursor-pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-4 border-b-4 border-black">
            <SignatureBlock
              label="Requested by:"
              title="Student/Instructor"
              signatureName={signatures.requestedBy}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, requestedBy: v }))}
            />
            <SignatureBlock
              label="Endorsed by:"
              title="Instructor/Adviser"
              signatureName={signatures.endorsedBy}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, endorsedBy: v }))}
            />
            <SignatureBlock
              label="Released by:"
              title="Lab. Technician"
              signatureName={signatures.releasedBy}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, releasedBy: v }))}
            />
            <SignatureBlock
              label="Approved by:"
              title="Lab. Head/Prof. Chair"
              signatureName={signatures.approvedBy}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, approvedBy: v }))}
            />
          </div>

          {/* Date Row */}
          <div className="grid grid-cols-4 border-b-4 border-black">
            <div className="border-r-2 border-black p-2 text-center text-[8px] font-bold text-black">Date: _________</div>
            <div className="border-r-2 border-black p-2 text-center text-[8px] font-bold text-black">Date: _________</div>
            <div className="border-r-2 border-black p-2 text-center text-[8px] font-bold text-black">Date: _________</div>
            <div className="p-2 text-center text-[8px] font-bold text-black">Date: _________</div>
          </div>

          {/* Agreement */}
          <div className="bg-yellow-50 p-4 flex gap-3">
            <AlertIcon size={24} className="text-orange-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-orange-700 text-xs uppercase tracking-tight">Submission Agreement</p>
              <p className="text-[10px] text-black mt-1">By submitting this form, I acknowledge responsibility for the equipment requested. I agree to adhere to laboratory safety protocols and return all items to their original condition.</p>
            </div>
          </div>
          </form>
        </div>
      </div>

      {/* Submit */}
      <div className="max-w-5xl mx-auto mt-4 flex gap-3 no-print">
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-stone-700 hover:bg-stone-800 disabled:bg-stone-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckIcon size={18} />
              Submit & Save Form
            </>
          )}
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 no-print">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md w-full">
              <div className="flex gap-4">
                <AlertIcon size={24} className="text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-black mb-2">Error</h3>
                  <p className="text-gray-700 text-sm mb-4">{errorMsg}</p>
                  <button onClick={() => setErrorMsg(null)} className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-700 font-bold py-2 rounded-lg">
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 no-print">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white border border-emerald-500 rounded-xl p-6 max-w-md w-full text-center shadow-lg">
              <CheckIcon size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="font-bold text-black text-lg mb-2">Requisition Submitted!</h3>
              <p className="text-gray-600 text-sm mb-4">Your form has been saved and is ready for processing.</p>
              <button onClick={() => { setShowSuccessModal(false); router.push("/dashboard"); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-colors">
                Return to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
