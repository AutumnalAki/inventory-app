"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Modal from "@/components/Modal";
import { Input, SelectInput, TextArea } from "@/components/Input";
import {
  createIncidentReportWithInventorySync,
  getInventoryItemsForDamagePicker,
  updateIncidentReportWithInventorySync,
  type IncidentReportCreateInput,
  type IncidentReportListItem,
  type InventoryPickerItem,
  type DamagedItemInput,
} from "@/lib/actions/inventory";
import { useRole } from "@/context/RoleContext";

type Step = 1 | 2 | 3 | 4;

type IncidentFormState = {
  student_name: string;
  student_number: string;
  course_code: string;
  designation: string;
  contact_number: string;
  incident_datetime: string;
  location: string;
  witness_name: string;
  instructor_name: string;
  incident_description: string;
  injury_details: string;
  response_notes: string;
};

type PendingDamageItem = DamagedItemInput & {
  available_quantity: number;
};

type IncidentReportDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (report: IncidentReportListItem) => void;
  mode?: "create" | "edit";
  initialReport?: IncidentReportListItem | null;
  reportOwnerUserId?: string | null;
  dialogClassName?: string;
  modeVariant?: "stepper" | "single-page";
};

const STEP_LABELS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "Personal" },
  { step: 2, label: "Details" },
  { step: 3, label: "Description" },
  { step: 4, label: "Equipment" },
];

const DESIGNATION_OPTIONS = [
  "Student",
  "Faculty",
  "Laboratory Assistant",
  "Technician",
  "Staff",
  "Visitor",
  "Other",
] as const;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? 0 : 30;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const suffix = hours < 12 ? "AM" : "PM";
  const label = `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  return { value, label };
});

const EMPTY_FORM: IncidentFormState = {
  student_name: "",
  student_number: "",
  course_code: "",
  designation: "",
  contact_number: "",
  incident_datetime: "",
  location: "",
  witness_name: "",
  instructor_name: "",
  incident_description: "",
  injury_details: "",
  response_notes: "",
};

const RESPONSE_EDITOR_ROLES = new Set([
  "developer",
  "superadmin",
  "administrator",
  "program chair",
  "personnel",
  "lab personnel",
  "laboratory personnel",
  "laboratory assistant",
  "technician",
  "laboratory head",
]);

const toDateTimeLocal = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const getDatePart = (dateTime: string): string => {
  if (!dateTime || !dateTime.includes("T")) return "";
  return dateTime.split("T")[0] || "";
};

const getTimePart = (dateTime: string): string => {
  if (!dateTime || !dateTime.includes("T")) return "";
  const raw = dateTime.split("T")[1] || "";
  return raw.slice(0, 5);
};

const buildDateTime = (datePart: string, timePart: string): string => {
  if (!datePart) return "";
  const normalizedTime = timePart || "08:00";
  return `${datePart}T${normalizedTime}`;
};

const buildInitialForm = (report: IncidentReportListItem | null | undefined): IncidentFormState => {
  if (!report) return EMPTY_FORM;

  return {
    student_name: report.student_name || "",
    student_number: report.student_number || "",
    course_code: report.course_code || "",
    designation: report.designation || "",
    contact_number: report.contact_number || "",
    incident_datetime: toDateTimeLocal(report.incident_datetime || report.created_at),
    location: report.location || "",
    witness_name: report.witness_name || "",
    instructor_name: report.instructor_name || "",
    incident_description: report.incident_description || "",
    injury_details: report.injury_details || "",
    response_notes: report.response_notes || "",
  };
};

export default function IncidentReportDialog({
  open,
  onClose,
  onSuccess,
  mode = "create",
  initialReport,
  reportOwnerUserId,
  dialogClassName,
  modeVariant = "stepper",
}: IncidentReportDialogProps) {
  const roleContext = useRole();
  const role = roleContext?.role;
  const previewRole = roleContext?.previewRole;
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<IncidentFormState>(EMPTY_FORM);
  const [pendingDamages, setPendingDamages] = useState<PendingDamageItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryPickerItem[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [damageCountInput, setDamageCountInput] = useState("");
  const [damageNotesInput, setDamageNotesInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSinglePageMode = modeVariant === "single-page";

  useEffect(() => {
    if (!open) return;

    const initial = buildInitialForm(initialReport);
    setForm(initial);
    setStep(1);
    setSubmitError(null);
    setSearchTerm("");
    setSelectedInventoryId("");
    setDamageCountInput("");
    setDamageNotesInput("");

    const reportItems = (initialReport?.damaged_items || []).map((item) => ({
      ...item,
      available_quantity: 0,
    }));
    setPendingDamages(reportItems);
  }, [open, initialReport]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    const fetchInventory = async () => {
      setLoadingInventory(true);
      const result = await getInventoryItemsForDamagePicker();
      if (!mounted) return;

      if (result.error || !result.data) {
        setInventoryError(result.error || "Failed to load inventory items.");
        setInventoryItems([]);
      } else {
        setInventoryError(null);
        setInventoryItems(result.data);
      }

      setLoadingInventory(false);
    };

    void fetchInventory();

    return () => {
      mounted = false;
    };
  }, [open]);

  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );

  useEffect(() => {
    if (pendingDamages.length === 0) return;

    setPendingDamages((previous) =>
      previous.map((item) => ({
        ...item,
        available_quantity: inventoryById.get(item.inventory_item_id)?.quantity ?? item.available_quantity,
      })),
    );
  }, [inventoryById]);

  const filteredInventoryItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return inventoryItems;
    }

    return inventoryItems.filter((item) => {
      return (
        item.item_name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [inventoryItems, searchTerm]);

  const selectedInventoryItem = selectedInventoryId
    ? inventoryById.get(selectedInventoryId)
    : undefined;

  const effectiveRole = (previewRole || role || "Student").toLowerCase();
  const canAddResponseNotes = RESPONSE_EDITOR_ROLES.has(effectiveRole);

  const incidentDateValue = getDatePart(form.incident_datetime);
  const incidentTimeValue = getTimePart(form.incident_datetime);

  const availableDesignationOptions = useMemo(() => {
    if (!form.designation) {
      return [...DESIGNATION_OPTIONS];
    }

    if (DESIGNATION_OPTIONS.includes(form.designation as (typeof DESIGNATION_OPTIONS)[number])) {
      return [...DESIGNATION_OPTIONS];
    }

    return [form.designation, ...DESIGNATION_OPTIONS];
  }, [form.designation]);

  const isStepValid = (currentStep: Step): boolean => {
    if (currentStep === 1) {
      return Boolean(
        form.student_name.trim() &&
          form.student_number.trim() &&
          form.course_code.trim() &&
          form.designation.trim() &&
          form.contact_number.trim(),
      );
    }

    if (currentStep === 2) {
      return Boolean(form.incident_datetime && form.location.trim());
    }

    if (currentStep === 3) {
      return Boolean(form.incident_description.trim());
    }

    if (currentStep === 4) {
      return pendingDamages.length > 0;
    }

    return true;
  };

  const updateField = <K extends keyof IncidentFormState>(
    field: K,
    value: IncidentFormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const addPendingDamage = () => {
    setSubmitError(null);

    if (!selectedInventoryItem) {
      setSubmitError("Select an item from inventory first.");
      return;
    }

    const parsedCount = Number(damageCountInput);
    if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
      setSubmitError("Quantity damaged must be a whole number greater than zero.");
      return;
    }

    if (parsedCount > selectedInventoryItem.quantity) {
      setSubmitError(
        `Cannot add ${parsedCount}. Available stock is ${selectedInventoryItem.quantity}.`,
      );
      return;
    }

    setPendingDamages((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.inventory_item_id === selectedInventoryItem.id,
      );

      if (existingIndex === -1) {
        return [
          ...previous,
          {
            inventory_item_id: selectedInventoryItem.id,
            item_name: selectedInventoryItem.item_name,
            damage_count: parsedCount,
            damage_notes: damageNotesInput.trim() || null,
            available_quantity: selectedInventoryItem.quantity,
          },
        ];
      }

      const updated = [...previous];
      const current = updated[existingIndex];
      const mergedCount = current.damage_count + parsedCount;

      if (mergedCount > selectedInventoryItem.quantity) {
        setSubmitError(
          `Total damaged count for ${selectedInventoryItem.item_name} exceeds available stock.`,
        );
        return previous;
      }

      updated[existingIndex] = {
        ...current,
        damage_count: mergedCount,
        damage_notes: damageNotesInput.trim() || current.damage_notes || null,
      };

      return updated;
    });

    setSelectedInventoryId("");
    setDamageCountInput("");
    setDamageNotesInput("");
  };

  const removePendingDamage = (inventoryItemId: string) => {
    setPendingDamages((previous) =>
      previous.filter((item) => item.inventory_item_id !== inventoryItemId),
    );
  };

  const goNext = () => {
    setSubmitError(null);
    if (!isStepValid(step)) {
      if (step === 4) {
        setSubmitError("Add at least one damaged item before submitting.");
      } else {
        setSubmitError("Please complete the required fields before continuing.");
      }
      return;
    }

    setStep((previous) => (previous < 4 ? ((previous + 1) as Step) : previous));
  };

  const goPrevious = () => {
    setSubmitError(null);
    setStep((previous) => (previous > 1 ? ((previous - 1) as Step) : previous));
  };

  const submit = async () => {
    setSubmitError(null);

    if (isSinglePageMode) {
      const firstInvalidStep = ([1, 2, 3, 4] as Step[]).find((currentStep) => !isStepValid(currentStep));
      if (firstInvalidStep) {
        if (firstInvalidStep === 4) {
          setSubmitError("Add at least one damaged item before submitting.");
        } else {
          setSubmitError("Please complete all required fields before submitting.");
        }
        return;
      }
    } else if (!isStepValid(4)) {
      setSubmitError("Add at least one damaged item before submitting.");
      return;
    }

    const damaged_items = pendingDamages.map((item) => ({
      inventory_item_id: item.inventory_item_id,
      item_name: item.item_name,
      damage_count: item.damage_count,
      damage_notes: item.damage_notes,
    }));

    const payload: IncidentReportCreateInput = {
      user_id: reportOwnerUserId || undefined,
      student_name: form.student_name.trim(),
      student_number: form.student_number.trim(),
      course_code: form.course_code.trim(),
      designation: form.designation.trim(),
      contact_number: form.contact_number.trim(),
      incident_datetime: form.incident_datetime,
      location: form.location.trim(),
      witness_name: form.witness_name.trim() || null,
      instructor_name: form.instructor_name.trim() || null,
      incident_description: form.incident_description.trim(),
      injury_details: form.injury_details.trim() || null,
      damaged_items,
    };

    if (canAddResponseNotes) {
      payload.response_notes = form.response_notes.trim() || null;
    }

    setIsSubmitting(true);

    const result =
      mode === "edit" && initialReport?.id
        ? await updateIncidentReportWithInventorySync(initialReport.id, payload)
        : await createIncidentReportWithInventorySync(payload);

    setIsSubmitting(false);

    if (result.error || !result.data) {
      setSubmitError(result.error || "Failed to submit incident report.");
      return;
    }

    onSuccess?.(result.data);
    onClose();
  };

  const footer = isSinglePageMode ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-gray-500">Single-page form</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {mode === "edit" ? "Update Report" : "Submit Report"}
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-gray-500">
        Step {step} of 4
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          disabled={isSubmitting}
        >
          Cancel
        </button>

        {step > 1 && (
          <button
            type="button"
            onClick={goPrevious}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            disabled={isSubmitting}
          >
            <ChevronLeft size={14} />
            Previous
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
            disabled={isSubmitting}
          >
            Next
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === "edit" ? "Update Report" : "Submit Report"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit Incident Report" : "Digital Incident Report"}
      subtitle={
        isSinglePageMode
          ? "Fill out all required sections and submit once."
          : "Complete all four steps before submission."
      }
      className={dialogClassName}
      footer={footer}
    >
      {!isSinglePageMode ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEP_LABELS.map((item) => {
            const active = item.step === step;
            const complete = item.step < step;

            return (
              <div
                key={item.step}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                  active
                    ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                    : complete
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-100"
                      : "border-white/10 bg-black/20 text-gray-500"
                }`}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className={isSinglePageMode ? "space-y-4" : ""}>
      {(isSinglePageMode || step === 1) && (
        <div className={isSinglePageMode ? "rounded-xl border border-white/10 bg-black/20 p-3.5" : ""}>
          {isSinglePageMode ? (
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Personal Information</p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Name"
            value={form.student_name}
            onChange={(event) => updateField("student_name", event.target.value)}
            placeholder="Enter full name"
            required
          />
          <Input
            label="Student Number"
            value={form.student_number}
            onChange={(event) =>
              updateField("student_number", event.target.value.replace(/\D/g, ""))
            }
            placeholder="e.g. 2024-0001"
            inputMode="numeric"
            pattern="[0-9]*"
            required
          />
          <Input
            label="Course Code"
            value={form.course_code}
            onChange={(event) => updateField("course_code", event.target.value)}
            placeholder="e.g. CPE-301"
            required
          />
          <SelectInput
            label="Designation"
            value={form.designation}
            onChange={(event) => updateField("designation", event.target.value)}
            required
          >
            <option value="" className="bg-black">
              Select designation
            </option>
            {availableDesignationOptions.map((designation) => (
              <option key={designation} value={designation} className="bg-black">
                {designation}
              </option>
            ))}
          </SelectInput>
          <Input
            label="Contact"
            value={form.contact_number}
            onChange={(event) =>
              updateField("contact_number", event.target.value.replace(/\D/g, ""))
            }
            placeholder="09xxxxxxxxx"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className="md:col-span-2"
          />
        </div>
        </div>
      )}

      {(isSinglePageMode || step === 2) && (
        <div className={isSinglePageMode ? "rounded-xl border border-white/10 bg-black/20 p-3.5" : ""}>
          {isSinglePageMode ? (
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Incident Details</p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            type="date"
            label="Incident Date"
            value={incidentDateValue}
            onChange={(event) =>
              updateField("incident_datetime", buildDateTime(event.target.value, incidentTimeValue))
            }
            required
          />
          <SelectInput
            label="Incident Time"
            value={incidentTimeValue}
            onChange={(event) =>
              updateField("incident_datetime", buildDateTime(incidentDateValue, event.target.value))
            }
            required
          >
            <option value="" className="bg-black">
              Select time
            </option>
            {TIME_OPTIONS.map((time) => (
              <option key={time.value} value={time.value} className="bg-black">
                {time.label}
              </option>
            ))}
          </SelectInput>
          <Input
            label="Location"
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Laboratory / Room"
            required
            className="md:col-span-2"
          />
          <Input
            label="Witness"
            value={form.witness_name}
            onChange={(event) => updateField("witness_name", event.target.value)}
            placeholder="Witness name"
          />
          <Input
            label="Instructor"
            value={form.instructor_name}
            onChange={(event) => updateField("instructor_name", event.target.value)}
            placeholder="Instructor name"
          />
        </div>
        </div>
      )}

      {(isSinglePageMode || step === 3) && (
        <div className={isSinglePageMode ? "rounded-xl border border-white/10 bg-black/20 p-3.5" : ""}>
          {isSinglePageMode ? (
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Description</p>
          ) : null}
          <div className="space-y-3">
          <TextArea
            label="Detailed Incident Description"
            value={form.incident_description}
            onChange={(event) => updateField("incident_description", event.target.value)}
            rows={7}
            required
            placeholder="Describe what happened, including sequence of events and immediate actions taken."
          />
          <TextArea
            label="Injury Details"
            value={form.injury_details}
            onChange={(event) => updateField("injury_details", event.target.value)}
            rows={4}
            placeholder="Include type of injury and first aid administered, if applicable."
          />
          {canAddResponseNotes ? (
            <TextArea
              label="Response / Resolution Notes (Personnel/Admin)"
              value={form.response_notes}
              onChange={(event) => updateField("response_notes", event.target.value)}
              rows={4}
              placeholder="Add resolution actions, follow-up, and personnel notes."
            />
          ) : null}
        </div>
        </div>
      )}

      {(isSinglePageMode || step === 4) && (
        <div className="space-y-4">
          {isSinglePageMode ? (
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Damaged Equipment</p>
          ) : null}
          <div className={`rounded-xl border border-white/10 p-3 ${isSinglePageMode ? "bg-black/10" : "bg-black/20"}`}>
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Search Equipment
                </span>
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search item name"
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500"
                  />
                </div>
              </label>
              <SelectInput
                label="Inventory Item"
                value={selectedInventoryId}
                onChange={(event) => setSelectedInventoryId(event.target.value)}
              >
                <option value="" className="bg-black">
                  Select item
                </option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id} className="bg-black">
                    {item.item_name}
                    {item.control_id ? ` (${item.control_id})` : ""} (Stock: {item.quantity})
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Equipment List
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {filteredInventoryItems.map((item) => {
                  const isSelected = selectedInventoryId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedInventoryId(item.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-100"
                          : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <span>
                        {item.item_name}
                        {item.control_id ? ` (${item.control_id})` : ""}
                      </span>
                      <span className="text-gray-500">Stock: {item.quantity}</span>
                    </button>
                  );
                })}

                {filteredInventoryItems.length === 0 ? (
                  <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-gray-500">
                    No equipment matched your search.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_auto]">
              <Input
                type="number"
                min={1}
                label="Qty Damaged"
                value={damageCountInput}
                onChange={(event) => setDamageCountInput(event.target.value)}
                placeholder="0"
              />
              <Input
                label="Damage Notes"
                value={damageNotesInput}
                onChange={(event) => setDamageNotesInput(event.target.value)}
                placeholder="Optional notes"
              />
              <div className="self-end">
                <button
                  type="button"
                  onClick={addPendingDamage}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3 py-2.5 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>

            {selectedInventoryItem ? (
              <p className="mt-2 text-xs text-gray-500">
                Available stock: {selectedInventoryItem.quantity}
              </p>
            ) : null}

            {loadingInventory ? (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Loading inventory...
              </div>
            ) : null}

            {inventoryError ? (
              <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {inventoryError}
              </div>
            ) : null}
          </div>

          <div className={`rounded-xl border border-white/10 ${isSinglePageMode ? "bg-black/10" : "bg-black/20"}`}>
            <div className="border-b border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              Pending Damage
            </div>

            {pendingDamages.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500">
                No equipment has been added yet.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {pendingDamages.map((item) => (
                  <div
                    key={item.inventory_item_id}
                    className="grid grid-cols-1 items-center gap-2 px-3 py-3 text-sm md:grid-cols-[1fr_auto_auto_auto]"
                  >
                    <div>
                      <p className="font-semibold text-white">{item.item_name || item.inventory_item_id}</p>
                      <p className="text-xs text-gray-500">ID: {item.inventory_item_id}</p>
                    </div>
                    <p className="text-xs text-gray-300">Damaged: {item.damage_count}</p>
                    <p className="text-xs text-gray-500">Stock: {item.available_quantity}</p>
                    <button
                      type="button"
                      onClick={() => removePendingDamage(item.inventory_item_id)}
                      className="inline-flex items-center justify-center rounded-md border border-red-500/40 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20"
                      aria-label="Remove pending item"
                    >
                      <Trash2 size={14} />
                    </button>

                    {item.damage_notes ? (
                      <p className="md:col-span-4 text-xs text-gray-500">
                        Notes: {item.damage_notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {submitError ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle size={14} />
          {submitError}
        </div>
      ) : null}
    </Modal>
  );
}
