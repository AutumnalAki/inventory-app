"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { supabase } from "@/lib/supabase";
import RequisitionFormTestingPage, {
  type RequisitionForm,
  type RequisitionItem,
} from "@/app/dashboard/requisition-form-testing/page";

type GenericItem = {
  name: string;
  quantity: number;
  unit: string;
};

type ClientPortalGenericRequisitionFormProps = {
  showLivePrintablePreview?: boolean;
  previewDefaultOpen?: boolean;
  compact?: boolean;
};

const TIME_OF_USE_OPTIONS = [
  "",
  "7:00 AM - 9:00 AM",
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "1:00 PM - 3:00 PM",
  "3:00 PM - 5:00 PM",
  "5:00 PM - 7:00 PM",
] as const;

const createEmptyItem = (): GenericItem => ({
  name: "",
  quantity: 0,
  unit: "",
});

const toUnit = (quantity: number): string => {
  return quantity === 1 ? "pc" : "pcs";
};

export default function ClientPortalGenericRequisitionForm({
  showLivePrintablePreview = true,
  previewDefaultOpen = false,
  compact = false,
}: ClientPortalGenericRequisitionFormProps) {
  const { inventory: inventoryItems, refreshData } = useInventory();

  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [instructor, setInstructor] = useState("");
  const [programSection, setProgramSection] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [room, setRoom] = useState("");
  const [timeOfUse, setTimeOfUse] = useState("");
  const [items, setItems] = useState<GenericItem[]>([createEmptyItem()]);
  const [previewOpen, setPreviewOpen] = useState(previewDefaultOpen);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const availableInventory = useMemo(() => {
    const aggregated = new Map<string, { name: string; quantity: number }>();

    for (const item of inventoryItems) {
      const key = String(item.name || "").trim().toLowerCase();
      if (!key) continue;

      const current = aggregated.get(key);
      const quantity = Number(item.quantity) || 0;

      if (!current) {
        aggregated.set(key, {
          name: item.name,
          quantity,
        });
      } else {
        current.quantity += quantity;
      }
    }

    return Array.from(aggregated.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryItems]);

  const availableQtyByName = useMemo(() => {
    return new Map(availableInventory.map((item) => [item.name.trim().toLowerCase(), item.quantity]));
  }, [availableInventory]);

  const rawItems = useMemo(() => {
    return items
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity) || 0,
        unit: item.unit || toUnit(Number(item.quantity) || 1),
      }))
      .filter((item) => item.name && item.quantity > 0);
  }, [items]);

  const printableItems = useMemo<RequisitionItem[]>(() => {
    return rawItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      dateOut: "",
      dateIn: "",
    }));
  }, [rawItems]);

  const previewData = useMemo<Partial<RequisitionForm>>(() => {
    return {
      studentName,
      studentNumber,
      purpose,
      instructor,
      programSection,
      courseCode,
      room,
      timeOfUse,
      items: printableItems,
      status: "Reserved",
      dateOut: "",
      dateIn: null,
    };
  }, [
    studentName,
    studentNumber,
    purpose,
    instructor,
    programSection,
    courseCode,
    room,
    timeOfUse,
    printableItems,
  ]);

  const setItemName = (index: number, name: string) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const selectedName = name.trim();
        const selectedQty = availableQtyByName.get(selectedName.toLowerCase()) ?? 0;
        const nextQuantity = Math.min(Math.max(item.quantity || 1, 1), Math.max(selectedQty, 1));

        if (!selectedName) {
          return {
            ...item,
            name,
            quantity: 0,
            unit: "",
          };
        }

        return {
          ...item,
          name,
          quantity: nextQuantity,
          unit: toUnit(nextQuantity),
        };
      }),
    );
  };

  const setItemQuantity = (index: number, quantityInput: string) => {
    if (quantityInput.trim() === "") {
      setItems((previous) =>
        previous.map((item, itemIndex) => {
          if (itemIndex !== index) return item;
          return {
            ...item,
            quantity: 0,
            unit: "",
          };
        }),
      );
      return;
    }

    const parsed = Number.parseInt(quantityInput, 10);

    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const available = item.name
          ? availableQtyByName.get(item.name.trim().toLowerCase()) ?? 0
          : Number.POSITIVE_INFINITY;

        const safeQuantity = Number.isFinite(parsed)
          ? Math.max(1, Math.min(parsed, Math.max(available, 1)))
          : 1;

        return {
          ...item,
          quantity: safeQuantity,
          unit: safeQuantity > 0 ? toUnit(safeQuantity) : "",
        };
      }),
    );
  };

  const addItem = () => {
    setItems((previous) => [...previous, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((previous) => {
      if (previous.length <= 1) {
        return [createEmptyItem()];
      }

      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const resetForm = () => {
    setStudentName("");
    setStudentNumber("");
    setPurpose("");
    setInstructor("");
    setProgramSection("");
    setCourseCode("");
    setRoom("");
    setTimeOfUse("");
    setItems([createEmptyItem()]);
  };

  const validate = (): string | null => {
    const requiredChecks: Array<[string, string]> = [
      [studentName.trim(), "student name"],
      [studentNumber.trim(), "student number"],
      [purpose.trim(), "purpose"],
      [instructor.trim(), "instructor"],
    ];

    for (const [value, label] of requiredChecks) {
      if (!value) {
        return `Please enter ${label}.`;
      }
    }

    if (rawItems.length === 0) {
      return "Please add at least one equipment item.";
    }

    for (const item of rawItems) {
      const available = availableQtyByName.get(item.name.toLowerCase()) ?? 0;
      if (item.quantity > available) {
        return `Quantity for ${item.name} exceeds available stock (${available}).`;
      }
    }

    return null;
  };

  const submit = async (requisitionType: "borrow" | "reservation") => {
    setErrorMsg(null);
    setSuccessId(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const id = `REQ-${year}-${random}`;
    const timestamp = new Date().toISOString();
    const signatureDate = timestamp.slice(0, 10);

    const status = requisitionType === "borrow" ? "Borrowed" : "Reserved";

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("requisitions").insert([
        {
          id,
          student_name: studentName.trim(),
          student_number: studentNumber.trim(),
          purpose: purpose.trim(),
          instructor: instructor.trim(),
          program_section: programSection.trim() || null,
          course_code: courseCode.trim() || null,
          room: room.trim() || null,
          time_of_use: timeOfUse || null,
          items: rawItems,
          status,
          requisition_type: requisitionType,
          date_out: timestamp,
          date_in: null,
          created_at: timestamp,
          signatures: {
            requestedBy: studentName.trim(),
            endorsedBy: instructor.trim(),
            releasedBy: "",
            approvedBy: "",
            signatureDates: {
              requestedBy: signatureDate,
              endorsedBy: signatureDate,
              releasedBy: "",
              approvedBy: "",
            },
            documentCode: {
              effectiveDate: "",
              revisionNo: "00",
              revisionDate: "",
            },
          },
        },
      ]);

      if (error) {
        throw error;
      }

      setSuccessId(id);
      resetForm();
    } catch (error: any) {
      const message = String(error?.message || "Failed to submit requisition.");
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-4 sm:p-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Client Requisition Form</h1>
        <p className="mt-1 text-sm text-gray-400">
          Mobile-friendly entry form. Data is mapped to the printable requisition layout.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs text-gray-300">
          Student Name
          <input
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="Surname, Firstname"
          />
        </label>

        <label className="text-xs text-gray-300">
          Student Number
          <input
            value={studentNumber}
            onChange={(event) => setStudentNumber(event.target.value.replace(/\D/g, ""))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="20240001"
            inputMode="numeric"
          />
        </label>

        <label className="text-xs text-gray-300 sm:col-span-2">
          Purpose
          <input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="Purpose of borrowing"
          />
        </label>

        <label className="text-xs text-gray-300">
          Instructor
          <input
            value={instructor}
            onChange={(event) => setInstructor(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="Instructor name"
          />
        </label>

        <label className="text-xs text-gray-300">
          Program and Section
          <input
            value={programSection}
            onChange={(event) => setProgramSection(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="BSIT 3A"
          />
        </label>

        <label className="text-xs text-gray-300">
          Course Code
          <input
            value={courseCode}
            onChange={(event) => setCourseCode(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="IT301"
          />
        </label>

        <label className="text-xs text-gray-300">
          Room
          <input
            value={room}
            onChange={(event) => setRoom(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="Lab 3"
          />
        </label>

        <label className="text-xs text-gray-300 sm:col-span-2">
          Time of Use
          <select
            value={timeOfUse}
            onChange={(event) => setTimeOfUse(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-black text-white">
              Select time slot (optional)
            </option>
            {TIME_OF_USE_OPTIONS.filter((option) => option).map((option) => (
              <option key={option} value={option} className="bg-black text-white">
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Requested Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => {
            const available = item.name
              ? availableQtyByName.get(item.name.trim().toLowerCase()) ?? 0
              : null;

            return (
              <div
                key={`${index}-${item.name}`}
                className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-black/30 p-2 md:grid-cols-[1fr_130px_90px_auto]"
              >
                <label className="text-[11px] text-gray-400">
                  Equipment
                  <select
                    value={item.name}
                    onChange={(event) => setItemName(index, event.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-black text-white">
                      Select equipment
                    </option>
                    {availableInventory.map((entry) => (
                      <option key={entry.name} value={entry.name} className="bg-black text-white">
                        {entry.name} (Stock: {entry.quantity})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[11px] text-gray-400">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={item.quantity > 0 ? item.quantity : ""}
                    onChange={(event) => setItemQuantity(index, event.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="text-[11px] text-gray-400">
                  Unit
                  <input
                    value={item.unit}
                    readOnly
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/50 px-2 py-2 text-sm text-gray-200"
                  />
                </label>

                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex items-center justify-center rounded-md border border-red-500/40 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                    aria-label="Remove item row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {available !== null ? (
                  <p className="md:col-span-4 text-[11px] text-gray-500">Available stock: {available}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {successId ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          <span className="inline-flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} />
            Requisition submitted successfully.
          </span>
          <p className="mt-1 text-xs">Reference ID: {successId}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void submit("reservation")}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/20 px-4 py-2.5 text-sm font-semibold text-blue-100 hover:bg-blue-500/30 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
          Submit as Reservation
        </button>

        <button
          type="button"
          onClick={() => void submit("borrow")}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
          Submit as Borrow
        </button>
      </div>
    </div>
  );

  if (!showLivePrintablePreview) {
    return <div className="mx-auto w-full max-w-3xl">{renderForm}</div>;
  }

  if (compact) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {renderForm}

        <div className="rounded-2xl border border-white/10 bg-[#101010] p-3">
          <button
            type="button"
            onClick={() => setPreviewOpen((previous) => !previous)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white hover:bg-black/40"
          >
            {previewOpen ? <EyeOff size={16} /> : <Eye size={16} />}
            {previewOpen ? "Hide Printable Preview" : "Show Printable Preview"}
          </button>

          {previewOpen ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-2">
              <RequisitionFormTestingPage
                embedded
                readOnly
                hideToolbar
                hideSubmitButtons
                hideDownloadCopyButton
                initialData={previewData}
                initialSignatures={{
                  requestedBy: studentName,
                  endorsedBy: instructor,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="xl:col-span-5">{renderForm}</div>

      <div className="xl:col-span-7 rounded-2xl border border-white/10 bg-[#101010] p-2">
        <div className="mb-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white">
          Printable Requisition Preview
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-2">
          <RequisitionFormTestingPage
            embedded
            readOnly
            hideToolbar
            hideSubmitButtons
            hideDownloadCopyButton
            initialData={previewData}
            initialSignatures={{
              requestedBy: studentName,
              endorsedBy: instructor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
