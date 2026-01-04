"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Plus, Edit3, Trash2, Save, X, Calendar, Tag, ChevronDown, ChevronUp, Loader2, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";
import { usePopup } from "@/context/PopupContext";

interface UpdateLog {
  id: string;
  version: string;
  title: string;
  description: string;
  changes: string[];
  type: "feature" | "improvement" | "bugfix" | "security";
  created_at: string;
}

const UPDATE_TYPES = [
  { id: "feature", label: "New Feature", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { id: "improvement", label: "Improvement", color: "bg-blue-500", textColor: "text-blue-400" },
  { id: "bugfix", label: "Bug Fix", color: "bg-orange-500", textColor: "text-orange-400" },
  { id: "security", label: "Security", color: "bg-red-500", textColor: "text-red-400" },
];

export default function UpdateLogsPage() {
  const { role } = useRole();
  const { showAlert, showConfirm } = usePopup();
  const isDeveloper = role?.toLowerCase() === "developer";
  
  const [updates, setUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit/Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<UpdateLog | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    version: "",
    title: "",
    description: "",
    changes: [""],
    type: "feature" as UpdateLog["type"]
  });

  // Fetch update logs from Supabase
  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('update_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUpdates(data || []);
      if (data && data.length > 0) {
        if (!expandedId) {
          setExpandedId(data[0].id);
        }
        // Save the latest update's created_at as the last seen timestamp
        localStorage.setItem("labTrack_lastSeenUpdate", data[0].created_at);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchUpdates();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('update_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'update_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUpdates(prev => [payload.new as UpdateLog, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setUpdates(prev => prev.map(u => 
              u.id === payload.new.id ? payload.new as UpdateLog : u
            ));
          } else if (payload.eventType === 'DELETE') {
            setUpdates(prev => prev.filter(u => u.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddNew = () => {
    setEditingUpdate(null);
    setFormData({
      version: "",
      title: "",
      description: "",
      changes: [""],
      type: "feature"
    });
    setIsModalOpen(true);
  };

  const handleEdit = (update: UpdateLog) => {
    setEditingUpdate(update);
    setFormData({
      version: update.version,
      title: update.title,
      description: update.description,
      changes: update.changes.length > 0 ? update.changes : [""],
      type: update.type
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: "Delete Update Log",
      message: "Are you sure you want to delete this update log? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    
    if (confirmed) {
      try {
        const { error } = await supabase
          .from('update_logs')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        showAlert({ title: "Deleted", message: "Update log has been deleted.", variant: "success" });
      } catch (error) {
        console.error('Error deleting update:', error);
        showAlert({ title: "Error", message: "Failed to delete update log.", variant: "error" });
      }
    }
  };

  const handleSave = async () => {
    if (!formData.version || !formData.title) {
      showAlert({ title: "Error", message: "Please fill in version and title.", variant: "error" });
      return;
    }

    setSaving(true);

    const filteredChanges = formData.changes.filter(c => c.trim() !== "");
    
    try {
      if (editingUpdate) {
        // Update existing
        const { error } = await supabase
          .from('update_logs')
          .update({
            version: formData.version,
            title: formData.title,
            description: formData.description,
            changes: filteredChanges,
            type: formData.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUpdate.id);
        
        if (error) throw error;
        
        showAlert({ title: "Updated", message: "Update log has been modified.", variant: "success" });
      } else {
        // Add new
        const { error } = await supabase
          .from('update_logs')
          .insert({
            version: formData.version,
            title: formData.title,
            description: formData.description,
            changes: filteredChanges,
            type: formData.type
          });
        
        if (error) throw error;
        
        showAlert({ title: "Added", message: "New update log has been created.", variant: "success" });
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving update:', error);
      showAlert({ title: "Error", message: "Failed to save update log.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addChangeItem = () => {
    setFormData(prev => ({ ...prev, changes: [...prev.changes, ""] }));
  };

  const removeChangeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index)
    }));
  };

  const updateChangeItem = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((c, i) => i === index ? value : c)
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getTypeConfig = (type: UpdateLog["type"]) => {
    return UPDATE_TYPES.find(t => t.id === type) || UPDATE_TYPES[0];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white flex items-center gap-2">
            <Sparkles className="text-amber-500" size={24} />
            Update Logs
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            See what's new in CDM LabTrack
          </p>
        </div>
        
        {isDeveloper && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
          >
            <Plus size={18} />
            Add Update
          </motion.button>
        )}
      </div>

      {/* Updates List */}
      <div className="space-y-3 md:space-y-4">
        <AnimatePresence mode="popLayout">
          {updates.map((update, index) => {
            const typeConfig = getTypeConfig(update.type);
            const isExpanded = expandedId === update.id;
            
            return (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl md:rounded-2xl overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : update.id)}
                  className="w-full p-4 md:p-5 flex items-start gap-3 md:gap-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {/* Version Badge */}
                  <div className="shrink-0 w-14 md:w-16 h-14 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 flex flex-col items-center justify-center border border-gray-200 dark:border-white/10">
                    <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">v</span>
                    <span className="text-sm md:text-lg font-bold text-black dark:text-white">{update.version}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold ${typeConfig.color} text-white`}>
                        {typeConfig.label}
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(update.created_at)}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm md:text-base text-black dark:text-white mt-1.5 truncate">
                      {update.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {update.description}
                    </p>
                  </div>
                  
                  {/* Expand Icon */}
                  <div className="shrink-0 p-1">
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>
                
                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-gray-200 dark:border-white/10 pt-4">
                        {update.changes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Changes
                            </h4>
                            <ul className="space-y-1.5">
                              {update.changes.map((change, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-gray-600 dark:text-gray-300">
                                  <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.color} mt-1.5 shrink-0`} />
                                  {change}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Developer Actions */}
                        {isDeveloper && (
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(update); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(update.id); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 size={40} className="mx-auto mb-3 animate-spin text-cyan-500" />
            <p className="text-gray-500 font-medium">Loading updates...</p>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && updates.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Sparkles size={40} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No update logs yet</p>
            <p className="text-sm">Check back later for updates!</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#111] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 md:p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-black dark:text-white">
                  {editingUpdate ? "Edit Update Log" : "New Update Log"}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">
                {/* Version & Type Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Version</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="1.0.0"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as UpdateLog["type"] }))}
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 [&>option]:bg-white [&>option]:dark:bg-[#1a1a1a] [&>option]:text-black [&>option]:dark:text-white"
                    >
                      {UPDATE_TYPES.map(type => (
                        <option key={type.id} value={type.id} className="bg-white dark:bg-[#1a1a1a] text-black dark:text-white">{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What's the main update?"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                
                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this update..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  />
                </div>
                
                {/* Changes List */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Changes</label>
                  <div className="space-y-2">
                    {formData.changes.map((change, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={change}
                          onChange={(e) => updateChangeItem(index, e.target.value)}
                          placeholder={`Change ${index + 1}`}
                          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        {formData.changes.length > 1 && (
                          <button
                            onClick={() => removeChangeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addChangeItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Add Change
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-4 md:p-5 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
