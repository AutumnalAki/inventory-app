"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface RequisitionItem {
  name: string;
  quantity: number;
  unit: string;
  dateOut?: string;
  dateIn?: string;
}

interface Requisition {
  id: string;
  student_name: string;
  student_number: string;
  purpose: string;
  instructor: string;
  program_section: string;
  course_code: string;
  room: string;
  time_of_use: string;
  items: RequisitionItem[];
  signatures?: {
    requestedBy?: string;
    endorsedBy?: string;
    releasedBy?: string;
    approvedBy?: string;
  };
  status: "Reserved" | "Approved" | "Released" | "Completed" | "Cancelled";
  date_out: string;
  date_in: string | null;
  created_at: string;
}

export default function RequisitionTrackingPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("requisitions")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setRequisitions(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching requisitions:", err);
      setError(err.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-blue-100 text-blue-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Released":
        return "bg-purple-100 text-purple-800";
      case "Completed":
        return "bg-emerald-100 text-emerald-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getItemsDisplay = (items: RequisitionItem[]) => {
    const validItems = items.filter((i) => i.name && i.quantity > 0);
    return validItems.length > 0
      ? `${validItems.length} item${validItems.length > 1 ? "s" : ""}`
      : "No items";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black/50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Requisition Tracking</h1>
          <div className="text-center text-gray-400">Loading requisitions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Requisition Tracking</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {requisitions.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
            <p className="text-gray-400">No requisitions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Student Number</th>
                    <th className="px-4 py-3 text-left font-semibold">Items</th>
                    <th className="px-4 py-3 text-left font-semibold">Room</th>
                    <th className="px-4 py-3 text-left font-semibold">Instructor</th>
                    <th className="px-4 py-3 text-left font-semibold">Date Borrowed</th>
                    <th className="px-4 py-3 text-left font-semibold">Date Returned</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requisitions.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRequisition(req)}
                    >
                      <td className="px-4 py-3 text-gray-900 font-medium">{req.student_number}</td>
                      <td className="px-4 py-3 text-gray-600">{getItemsDisplay(req.items)}</td>
                      <td className="px-4 py-3 text-gray-600">{req.room}</td>
                      <td className="px-4 py-3 text-gray-600">{req.instructor}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(req.date_out)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {req.date_in ? formatDate(req.date_in) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequisition(req);
                          }}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for selected requisition */}
      <AnimatePresence>
        {selectedRequisition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 text-white px-6 py-4 flex justify-between items-center border-b">
                <h2 className="text-xl font-bold">Requisition Details</h2>
                <button
                  onClick={() => setSelectedRequisition(null)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Requisition ID</p>
                    <p className="text-lg text-gray-900 font-mono">{selectedRequisition.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedRequisition.status)}`}>
                      {selectedRequisition.status}
                    </span>
                  </div>
                </div>

                {/* Student Info */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Student Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-gray-900">{selectedRequisition.student_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Student Number</p>
                      <p className="text-gray-900">{selectedRequisition.student_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Program & Section</p>
                      <p className="text-gray-900">{selectedRequisition.program_section}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Course Code</p>
                      <p className="text-gray-900">{selectedRequisition.course_code}</p>
                    </div>
                  </div>
                </div>

                {/* Requisition Details */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Requisition Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Instructor</p>
                      <p className="text-gray-900">{selectedRequisition.instructor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Room</p>
                      <p className="text-gray-900">{selectedRequisition.room}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time of Use</p>
                      <p className="text-gray-900">{selectedRequisition.time_of_use || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Purpose</p>
                      <p className="text-gray-900">{selectedRequisition.purpose}</p>
                    </div>
                  </div>
                </div>

                {/* Equipment Items */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Equipment Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Equipment</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Unit</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Date Out</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Date In</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedRequisition.items
                          .filter((item) => item.name && item.quantity > 0)
                          .map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">{item.name}</td>
                              <td className="px-3 py-2 text-center text-gray-900">{item.quantity}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.unit}</td>
                              <td className="px-3 py-2 text-gray-600">
                                {item.dateOut
                                  ? new Date(item.dateOut).toLocaleDateString("en-US")
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {item.dateIn
                                  ? new Date(item.dateIn).toLocaleDateString("en-US")
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                {selectedRequisition.signatures && (
                  <div className="border-t pt-4">
                    <h3 className="font-bold text-gray-900 mb-3">Signatures</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequisition.signatures.requestedBy && (
                        <div>
                          <p className="text-sm text-gray-600">Requested by</p>
                          <p className="text-gray-900">{selectedRequisition.signatures.requestedBy}</p>
                        </div>
                      )}
                      {selectedRequisition.signatures.endorsedBy && (
                        <div>
                          <p className="text-sm text-gray-600">Endorsed by</p>
                          <p className="text-gray-900">{selectedRequisition.signatures.endorsedBy}</p>
                        </div>
                      )}
                      {selectedRequisition.signatures.releasedBy && (
                        <div>
                          <p className="text-sm text-gray-600">Released by</p>
                          <p className="text-gray-900">{selectedRequisition.signatures.releasedBy}</p>
                        </div>
                      )}
                      {selectedRequisition.signatures.approvedBy && (
                        <div>
                          <p className="text-sm text-gray-600">Approved by</p>
                          <p className="text-gray-900">{selectedRequisition.signatures.approvedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="text-gray-900">{formatDate(selectedRequisition.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date Out</p>
                      <p className="text-gray-900">{formatDate(selectedRequisition.date_out)}</p>
                    </div>
                    {selectedRequisition.date_in && (
                      <div>
                        <p className="text-sm text-gray-600">Date In</p>
                        <p className="text-gray-900">{formatDate(selectedRequisition.date_in)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-100 px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setSelectedRequisition(null)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
