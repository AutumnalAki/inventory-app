"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useInventory } from "@/context/InventoryContext";
import { supabase } from "@/lib/supabase";
import { Icons } from "@/constants/icons";
import { downloadRequisitionPdf, type RequisitionPdfData } from "@/lib/requisitionPdf";

// === LOGO ===
const LOGO_URL = "/favicon.ico";
const TIME_OF_USE_OPTIONS = [
  "",
  "7:00 AM - 9:00 AM",
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "1:00 PM - 3:00 PM",
  "3:00 PM - 5:00 PM",
  "5:00 PM - 7:00 PM",
];

// === TYPES ===
export interface RequisitionItem {
  name: string;
  quantity: number;
  unit: string;
  dateOut?: string;
  dateIn?: string;
}

export interface RequisitionForm {
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

type FormSignatures = {
  requestedBy: string;
  endorsedBy: string;
  releasedBy: string;
  approvedBy: string;
};

type FormDocumentCode = {
  effectiveDate: string;
  revisionNo: string;
  revisionDate: string;
};

type FormSignatureDates = {
  requestedBy: string;
  endorsedBy: string;
  releasedBy: string;
  approvedBy: string;
};

type RequisitionFormTestingPageProps = {
  initialData?: Partial<RequisitionForm>;
  initialSignatures?: Partial<FormSignatures>;
  initialDocumentCode?: Partial<FormDocumentCode>;
  initialSignatureDates?: Partial<FormSignatureDates>;
  readOnly?: boolean;
  hideToolbar?: boolean;
  hideSubmitButtons?: boolean;
  embedded?: boolean;
  onCancel?: () => void;
};

const EMPTY_ITEM: RequisitionItem = { name: "", quantity: 0, unit: "", dateOut: "", dateIn: "" };

const buildInitialFormState = (initialData?: Partial<RequisitionForm>, targetRows = 18): Partial<RequisitionForm> => {
  const providedItems = (initialData?.items || []).map((item) => ({
    ...EMPTY_ITEM,
    ...item,
    quantity: Number(item.quantity) || 0,
  }));
  const paddedItems = [...providedItems];
  while (paddedItems.length < targetRows) {
    paddedItems.push({ ...EMPTY_ITEM });
  }

  return {
    studentName: "",
    studentNumber: "",
    purpose: "",
    instructor: "",
    programSection: "",
    courseCode: "",
    room: "",
    timeOfUse: "",
    ...initialData,
    items: paddedItems,
  };
};

const formatDisplayDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDisplayDateTime = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// === HELPER: DetailInput ===
const DetailInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, placeholder, disabled = false }) => (
  <div className="flex items-stretch h-full min-h-[2.25rem] border-b-2 border-black last:border-b-0 bg-white hover:bg-orange-50/30 transition-colors">
    <div className="w-32 shrink-0 flex items-center px-3 font-bold border-r-2 border-black">
      <span className="text-[9px] sm:text-xs leading-tight text-black">{label}</span>
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={disabled}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 px-3 py-1 bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black placeholder:text-gray-400 placeholder:italic focus:bg-orange-50/50"
    />
  </div>
);

// === HELPER: SignatureBlock ===
const SignatureBlock: React.FC<{ label: string; title: string; name?: string; signatureName?: string; onSignatureChange?: (v: string) => void; disabled?: boolean }> = ({ label, title, name, signatureName, onSignatureChange, disabled = false }) => (
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
        readOnly={disabled}
        disabled={disabled}
        placeholder="___________"
        className="text-[7px] sm:text-[8px] text-center text-black bg-transparent outline-none w-full mt-1 placeholder:text-gray-400"
      />
    )}
  </div>
);

export default function RequisitionFormTestingPage({
  initialData,
  initialSignatures,
  initialDocumentCode,
  initialSignatureDates,
  readOnly = false,
  hideToolbar = false,
  hideSubmitButtons = false,
  embedded = false,
  onCancel,
}: RequisitionFormTestingPageProps = {}) {
  const tableRowTarget = 18;
  const router = useRouter();
  const { inventory: inventoryItems, refreshData } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingRequisitionType, setPendingRequisitionType] = useState<"borrow" | "reservation" | null>(null);
  const [lastSubmittedCopy, setLastSubmittedCopy] = useState<RequisitionPdfData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Partial<RequisitionForm>>(() => buildInitialFormState(initialData, tableRowTarget));
  const [signatures, setSignatures] = useState<FormSignatures>({
    requestedBy: "",
    endorsedBy: "",
    releasedBy: "",
    approvedBy: "",
    ...initialSignatures,
  });
  const [documentCode, setDocumentCode] = useState<FormDocumentCode>({
    effectiveDate: "",
    revisionNo: "00",
    revisionDate: "",
    ...initialDocumentCode,
  });
  const [signatureDates, setSignatureDates] = useState<FormSignatureDates>({
    requestedBy: "",
    endorsedBy: "",
    releasedBy: "",
    approvedBy: "",
    ...initialSignatureDates,
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
    if (initialData) {
      setForm(buildInitialFormState(initialData, tableRowTarget));
    }
  }, [initialData, tableRowTarget]);

  useEffect(() => {
    if (initialSignatures) {
      setSignatures((prev) => ({ ...prev, ...initialSignatures }));
    }
  }, [initialSignatures]);

  useEffect(() => {
    if (initialDocumentCode) {
      setDocumentCode((prev) => ({ ...prev, ...initialDocumentCode }));
    }
  }, [initialDocumentCode]);

  useEffect(() => {
    if (initialSignatureDates) {
      setSignatureDates((prev) => ({ ...prev, ...initialSignatureDates }));
    }
  }, [initialSignatureDates]);

  useEffect(() => {
    if (!readOnly) {
      refreshData();
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveSuggestionRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [refreshData]);

  const handleFieldChange = (field: string, value: string) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "studentName") {
      setSignatures((prev) => ({ ...prev, requestedBy: value }));
    }

    if (field === "instructor") {
      setSignatures((prev) => ({ ...prev, endorsedBy: value }));
    }
  };

  const handleStudentNumberChange = (value: string) => {
    if (readOnly) return;
    const digitsOnly = value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, studentNumber: digitsOnly }));
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
    if (readOnly) return;
    const newItems = [...(form.items || [])];
    let itemValue: string | number = value;

    if (field === "quantity") {
      const parsed = parseInt(value as string, 10);
      itemValue = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      if (Number(itemValue) <= 0) {
        newItems[index].unit = "";
      } else {
        newItems[index].unit = Number(itemValue) === 1 ? "pc" : "pcs";
      }
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
    if (readOnly) return;
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

  const validateFormBeforeSubmit = (): string | null => {
    const checks = [
      [form.studentName?.trim(), "Student Name"],
      [form.studentNumber?.trim(), "Student Number"],
      [form.purpose?.trim(), "Purpose"],
      [form.instructor?.trim(), "Instructor"],
    ];

    for (const [value, label] of checks) {
      if (!value) {
        return `Please enter the ${label}.`;
      }
    }

    const rawItems = (form.items || []).filter((i) => i.name.trim() !== "" && i.quantity > 0);
    if (rawItems.length === 0) {
      return "Please add at least one equipment item.";
    }

    return null;
  };

  const openVerificationModal = (requisitionType: "borrow" | "reservation") => {
    const validationError = validateFormBeforeSubmit();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setPendingRequisitionType(requisitionType);
    setShowVerificationModal(true);
  };

  const handleSubmit = async (requisitionType: "borrow" | "reservation") => {
    if (readOnly) return;

    const validationError = validateFormBeforeSubmit();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const rawItems = (form.items || []).filter((i) => i.name.trim() !== "" && i.quantity > 0);

    setIsSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const id = `REQ-${year}-${random}`;
      const signaturesPayload = {
        ...signatures,
        signatureDates,
        documentCode,
      };

      // New entries start pending approval; tab placement is controlled by requisition_type.
      const status = "Reserved";
      const timestamp = new Date().toISOString();

      const { error } = await supabase.from("requisitions").insert([
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
          status: status,
          requisition_type: requisitionType,
          date_out: timestamp,
          date_in: null,
          created_at: timestamp,
          signatures: signaturesPayload,
        },
      ]);

      if (error) {
        const rawError = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };

        const detailedMessage = [
          rawError.message,
          rawError.details,
          rawError.hint,
        ]
          .filter(Boolean)
          .join(" | ");

        throw new Error(
          detailedMessage ||
            "Failed to submit requisition. Please ensure the form is complete and try again."
        );
      }
      console.log("Requisition saved:", id);

      setLastSubmittedCopy({
        id,
        logoSrc: LOGO_URL,
        studentName: form.studentName || "",
        studentNumber: form.studentNumber || "",
        purpose: form.purpose || "",
        instructor: form.instructor || "",
        programSection: form.programSection || "",
        courseCode: form.courseCode || "",
        room: form.room || "",
        timeOfUse: form.timeOfUse || "",
        items: rawItems.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
        })),
        signatures: signaturesPayload,
        status,
        requisitionType,
        dateOut: timestamp,
        dateIn: null,
        createdAt: timestamp,
      });

      setShowVerificationModal(false);
      setPendingRequisitionType(null);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Submit error:", err);

      const isFetchFailure =
        err instanceof TypeError &&
        /Failed to fetch/i.test(String(err.message || ""));

      if (isFetchFailure) {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        setErrorMsg(
          offline
            ? "No internet connection. Please reconnect and try again."
            : "Unable to reach the database service. Please check Supabase URL/ANON key and try again."
        );
      } else {
        setErrorMsg(err?.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCopy = async () => {
    if (!lastSubmittedCopy) {
      setErrorMsg("No submitted requisition is available for download yet.");
      return;
    }

    try {
      await downloadRequisitionPdf(lastSubmittedCopy, `Requisition-${lastSubmittedCopy.id || "Copy"}.pdf`);
    } catch (error: any) {
      console.error("Failed to download requisition copy:", error);
      setErrorMsg("Failed to generate PDF copy.");
    }
  };

  const DownloadIcon = Icons.download;
  const CloseIcon = Icons.close;
  const AlertIcon = Icons.alert;
  const CheckIcon = Icons.check;

  const outerWrapperClass = embedded ? "" : "min-h-screen bg-black/50 py-4 px-3 sm:px-6";
  const formContainerClass = embedded
    ? "requisition-container max-w-4xl mx-auto"
    : "requisition-container max-w-4xl mx-auto backdrop-blur-md bg-black/40 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20 no-print";
  const formPaperStyle = embedded || readOnly ? undefined : { aspectRatio: "8.5/11" as const };
  const formLayoutClass = embedded || readOnly
    ? "border-4 border-black flex flex-col overflow-visible"
    : "border-4 border-black h-full flex flex-col overflow-auto";

  return (
    <div className={outerWrapperClass}>
      <style>{`@media print { body { background: white; margin: 0 !important; } .no-print { display: none !important; } .bg-black\/50 { background: white !important; } .requisition-container { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; backdrop-filter: none !important; background: white !important; } .requisition-paper { border-radius: 0 !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; } select { appearance: none !important; -webkit-appearance: none !important; -moz-appearance: none !important; background-image: none !important; } .requisition-paper, .requisition-paper form { overflow: visible !important; height: auto !important; max-height: none !important; } .requisition-paper ::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; } .submission-agreement { display: none !important; } .print-hide-empty-row { display: none !important; } }`}</style>

      {/* Toolbar */}
      {!hideToolbar && (
      <div className="max-w-4xl mx-auto mb-4 flex gap-2 justify-end items-center no-print">
        <button onClick={() => (onCancel ? onCancel() : router.back())} className="flex items-center gap-2 bg-stone-300 hover:bg-stone-400 text-stone-700 font-bold py-2 px-4 rounded-lg text-sm">
          <CloseIcon size={16} />
          Cancel
        </button>
      </div>
      )}

      {/* Glass Container with Form */}
      <div className={formContainerClass}>
        {/* Form Paper */}
        <div className="bg-white rounded-lg shadow-xl requisition-paper" style={formPaperStyle}>
          <form className={formLayoutClass}>
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
                <div className="border-r-2 border-b-2 border-black p-1 text-center">
                  <span className="text-[8px] text-black block">Effective Date</span>
                  {readOnly ? (
                    <div className="w-full mt-1 text-[8px] text-black text-center min-h-[12px]">
                      {formatDisplayDate(documentCode.effectiveDate)}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={documentCode.effectiveDate}
                      onChange={(e) => setDocumentCode((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                      className="w-full mt-1 text-[8px] text-black bg-transparent outline-none text-center"
                    />
                  )}
                </div>
                <div className="border-r-2 border-b-2 border-black p-1 text-center">
                  <span className="text-[8px] text-black block">Revision No.</span>
                  <input
                    type="text"
                    value={documentCode.revisionNo}
                    onChange={(e) => setDocumentCode((prev) => ({ ...prev, revisionNo: e.target.value }))}
                    readOnly={readOnly}
                    disabled={readOnly}
                    className="w-full mt-1 text-[9px] font-bold text-black bg-transparent outline-none text-center"
                  />
                </div>
                <div className="border-b-2 border-black p-1 text-center">
                  <span className="text-[8px] text-black block">Revision Date</span>
                  {readOnly ? (
                    <div className="w-full mt-1 text-[8px] text-black text-center min-h-[12px]">
                      {formatDisplayDate(documentCode.revisionDate)}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={documentCode.revisionDate}
                      onChange={(e) => setDocumentCode((prev) => ({ ...prev, revisionDate: e.target.value }))}
                      className="w-full mt-1 text-[8px] text-black bg-transparent outline-none text-center"
                    />
                  )}
                </div>
              </div>
              <div className="border-t-2 border-black p-1 text-center bg-yellow-50 text-[10px] font-mono font-bold text-black">AUTOGEN-DLI-SUBMIT</div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 border-b-4 border-black">
            <div className="border-r-4 border-black flex flex-col">
              <DetailInput label="Name:" value={form.studentName || ""} onChange={(v) => handleFieldChange("studentName", v)} placeholder="Surname, Firstname M.I." disabled={readOnly} />
              <div className="flex items-stretch h-full min-h-[2.25rem] border-b-2 border-black bg-white hover:bg-orange-50/30 transition-colors">
                <div className="w-32 shrink-0 flex items-center px-3 font-bold border-r-2 border-black">
                  <span className="text-[9px] sm:text-xs leading-tight text-black">Student No.:</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.studentNumber || ""}
                  onChange={(e) => handleStudentNumberChange(e.target.value)}
                  readOnly={readOnly}
                  disabled={readOnly}
                  placeholder="Enter student number"
                  className="flex-1 px-3 py-1 bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black placeholder:text-gray-400 placeholder:italic focus:bg-orange-50/50"
                />
              </div>
              <DetailInput label="Purpose:" value={form.purpose || ""} onChange={(v) => handleFieldChange("purpose", v)} placeholder="Enter purpose" disabled={readOnly} />
              <DetailInput label="Instructor:" value={form.instructor || ""} onChange={(v) => handleFieldChange("instructor", v)} placeholder="Enter instructor" disabled={readOnly} />
            </div>
            <div className="flex flex-col">
              <DetailInput label="Program & Section:" value={form.programSection || ""} onChange={(v) => handleFieldChange("programSection", v)} placeholder="Enter program/section" disabled={readOnly} />
              <DetailInput label="Course/Code:" value={form.courseCode || ""} onChange={(v) => handleFieldChange("courseCode", v)} placeholder="Enter course/code" disabled={readOnly} />
              <DetailInput label="Room:" value={form.room || ""} onChange={(v) => handleFieldChange("room", v)} placeholder="Enter room" disabled={readOnly} />
              <div className="flex items-stretch h-full min-h-[2.25rem] border-b-2 border-black bg-white hover:bg-orange-50/30">
                <div className="w-32 shrink-0 flex items-center px-3 font-bold border-r-2 border-black">
                  <span className="text-[9px] sm:text-xs text-black">Time of use:</span>
                </div>
                {readOnly ? (
                  <div className="flex-1 px-3 py-1 text-[10px] sm:text-xs font-medium text-black min-h-[1.5rem]">
                    {form.timeOfUse || ""}
                  </div>
                ) : (
                  <select
                    value={form.timeOfUse || ""}
                    onChange={(e) => handleFieldChange("timeOfUse", e.target.value)}
                    className="flex-1 px-3 py-1 bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black focus:bg-orange-50/50"
                  >
                    <option value="">Select time slot (optional)</option>
                    {TIME_OF_USE_OPTIONS.filter((option) => option !== "").map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="w-full border-b-4 border-black">
            <table className="w-full border-collapse">
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
                {(form.items || []).map((item, idx) => {
                  const isPrintableBlankRow =
                    readOnly &&
                    idx >= 10 &&
                    !item.name &&
                    Number(item.quantity || 0) <= 0 &&
                    !item.unit &&
                    !item.dateOut &&
                    !item.dateIn;

                  return (
                  <tr key={idx} className={`text-[9px] sm:text-xs border-b-2 border-black hover:bg-orange-50/20 text-black ${isPrintableBlankRow ? "print-hide-empty-row" : ""}`}>
                    <td className="border-r-2 border-black p-1 relative">
                      <input type="text" value={item.name} onChange={(e) => handleItemChange(idx, "name", e.target.value)} onFocus={() => !readOnly && showSuggestions(idx, item.name || "")} readOnly={readOnly} disabled={readOnly} placeholder={idx === 0 ? "Search items..." : ""} className="w-full bg-transparent outline-none text-[10px] sm:text-xs font-medium text-black placeholder:text-gray-400 focus:bg-orange-50 px-1" />
                      <AnimatePresence>
                        {!readOnly && activeSuggestionRow === idx && filteredSuggestions.length > 0 && (
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
                      <input type="number" min="0" value={Number(item.quantity) > 0 ? item.quantity : ""} onChange={(e) => handleItemChange(idx, "quantity", e.target.value)} readOnly={readOnly} disabled={readOnly} className="w-full bg-transparent outline-none text-center text-[10px] sm:text-xs text-black focus:bg-orange-50" />
                    </td>
                    <td className="border-r-2 border-black p-1 text-center">
                      {readOnly ? (
                        <div className="w-full text-center text-[10px] sm:text-xs text-black min-h-[1rem]">
                          {item.unit || ""}
                        </div>
                      ) : (
                        <select value={item.unit || ""} onChange={(e) => handleItemChange(idx, "unit", e.target.value)} className="w-full bg-transparent outline-none text-[10px] sm:text-xs text-black focus:bg-orange-50">
                          <option value=""></option>
                          <option value="pc">pc</option>
                          <option value="pcs">pcs</option>
                          <option value="set">set</option>
                          <option value="box">box</option>
                        </select>
                      )}
                    </td>
                    <td className="border-r-2 border-black p-1 text-center">
                      {readOnly ? (
                        <div className="w-full text-center text-[10px] sm:text-xs text-black min-h-[1rem]">
                          {formatDisplayDateTime(item.dateOut)}
                        </div>
                      ) : (
                        <input type="datetime-local" value={item.dateOut || ""} onChange={(e) => handleItemChange(idx, "dateOut", e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] sm:text-xs text-black focus:bg-orange-50 cursor-pointer" />
                      )}
                    </td>
                    <td className="p-1 text-center">
                      {readOnly ? (
                        <div className="w-full text-center text-[10px] sm:text-xs text-black min-h-[1rem]">
                          {formatDisplayDateTime(item.dateIn)}
                        </div>
                      ) : (
                        <input type="datetime-local" value={item.dateIn || ""} onChange={(e) => handleItemChange(idx, "dateIn", e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] sm:text-xs text-black focus:bg-orange-50 cursor-pointer" />
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-4 border-b-4 border-black">
            <SignatureBlock
              label="Requested by:"
              title="Student/Instructor"
              signatureName={signatures.requestedBy}
              disabled={readOnly}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, requestedBy: v }))}
            />
            <SignatureBlock
              label="Endorsed by:"
              title="Instructor/Adviser"
              signatureName={signatures.endorsedBy}
              disabled={readOnly}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, endorsedBy: v }))}
            />
            <SignatureBlock
              label="Released by:"
              title="Lab. Technician"
              signatureName={signatures.releasedBy}
              disabled={readOnly}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, releasedBy: v }))}
            />
            <SignatureBlock
              label="Approved by:"
              title="Lab. Head/Prof. Chair"
              signatureName={signatures.approvedBy}
              disabled={readOnly}
              onSignatureChange={(v) => setSignatures((prev) => ({ ...prev, approvedBy: v }))}
            />
          </div>

          {/* Date Row */}
          <div className="grid grid-cols-4 border-b-4 border-black">
            <div className="border-r-2 border-black p-2 text-center text-[8px] font-bold text-black">
              <span>Date:</span>
              {readOnly ? (
                <div className="w-full mt-1 text-[8px] text-black text-center min-h-[12px]">
                  {formatDisplayDate(signatureDates.requestedBy)}
                </div>
              ) : (
                <input
                  type="date"
                  value={signatureDates.requestedBy}
                  onChange={(e) => setSignatureDates((prev) => ({ ...prev, requestedBy: e.target.value }))}
                  className="w-full mt-1 text-[8px] text-black bg-transparent outline-none text-center"
                />
              )}
            </div>
            <div className="border-r-2 border-black p-2 text-center text-[8px] font-bold text-black">
              <span>Date:</span>
              {readOnly ? (
                <div className="w-full mt-1 text-[8px] text-black text-center min-h-[12px]">
                  {formatDisplayDate(signatureDates.endorsedBy)}
                </div>
              ) : (
                <input
                  type="date"
                  value={signatureDates.endorsedBy}
                  onChange={(e) => setSignatureDates((prev) => ({ ...prev, endorsedBy: e.target.value }))}
                  className="w-full mt-1 text-[8px] text-black bg-transparent outline-none text-center"
                />
              )}
            </div>
            <div className="border-r-2 border-black p-2 text-center text-[8px] font-bold text-black">
              <span>Date:</span>
              {readOnly ? (
                <div className="w-full mt-1 text-[8px] text-black text-center min-h-[12px]">
                  {formatDisplayDate(signatureDates.releasedBy)}
                </div>
              ) : (
                <input
                  type="date"
                  value={signatureDates.releasedBy}
                  onChange={(e) => setSignatureDates((prev) => ({ ...prev, releasedBy: e.target.value }))}
                  className="w-full mt-1 text-[8px] text-black bg-transparent outline-none text-center"
                />
              )}
            </div>
            <div className="p-2 text-center text-[8px] font-bold text-black">
              <span>Date:</span>
              {readOnly ? (
                <div className="w-full mt-1 text-[8px] text-black text-center min-h-[12px]">
                  {formatDisplayDate(signatureDates.approvedBy)}
                </div>
              ) : (
                <input
                  type="date"
                  value={signatureDates.approvedBy}
                  onChange={(e) => setSignatureDates((prev) => ({ ...prev, approvedBy: e.target.value }))}
                  className="w-full mt-1 text-[8px] text-black bg-transparent outline-none text-center"
                />
              )}
            </div>
          </div>

          {/* Agreement */}
          {!readOnly && (
          <div className="bg-yellow-50 p-4 flex gap-3 submission-agreement">
            <AlertIcon size={24} className="text-orange-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-orange-700 text-xs uppercase tracking-tight">Submission Agreement</p>
              <p className="text-[10px] text-black mt-1">By submitting this form, I acknowledge responsibility for the equipment requested. I agree to adhere to laboratory safety protocols and return all items to their original condition.</p>
            </div>
          </div>
          )}
          </form>
        </div>
      </div>

      {/* Submit */}
      {!(hideSubmitButtons || readOnly) && (
      <div className="max-w-5xl mx-auto mt-4 flex gap-3 no-print">
        <button 
          onClick={() => openVerificationModal("reservation")}
          disabled={isSubmitting} 
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckIcon size={18} />
              Reservation
            </>
          )}
        </button>
        <button 
          onClick={() => openVerificationModal("borrow")}
          disabled={isSubmitting} 
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckIcon size={18} />
              Borrow
            </>
          )}
        </button>
      </div>
      )}

      {/* Modals */}
      {!readOnly && (
      <>
      <AnimatePresence>
        {showVerificationModal && pendingRequisitionType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 no-print">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white border border-blue-500 rounded-xl p-6 max-w-lg w-full shadow-lg">
              <h3 className="font-bold text-black text-lg mb-2">Verify Requisition Form</h3>
              <p className="text-gray-700 text-sm mb-4">
                Please verify your details before submitting as {pendingRequisitionType === "borrow" ? "Borrow" : "Reservation"}.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                <div>
                  <p className="font-bold text-gray-700">Name</p>
                  <p className="text-black">{form.studentName || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700">Student No.</p>
                  <p className="text-black">{form.studentNumber || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700">Purpose</p>
                  <p className="text-black">{form.purpose || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700">Items</p>
                  <p className="text-black">{(form.items || []).filter((i) => i.name.trim() !== "" && i.quantity > 0).length}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => { setShowVerificationModal(false); setPendingRequisitionType(null); }}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold py-2 px-4 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit(pendingRequisitionType)}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-bold py-2 px-4 rounded-lg text-sm"
                >
                  {isSubmitting ? "Submitting..." : "Confirm Submit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    void handleDownloadCopy();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-800 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  <DownloadIcon size={16} />
                  Download Copy
                </button>
                <button onClick={() => { setShowSuccessModal(false); router.push("/dashboard"); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-colors">
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}
