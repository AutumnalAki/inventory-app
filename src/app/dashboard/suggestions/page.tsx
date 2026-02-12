"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Lightbulb,
  Send,
  Loader2,
  MessageSquarePlus,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Filter,
  Search,
  Trash2,
  ChevronDown,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";
import { usePopup } from "@/context/PopupContext";
import { useRouter } from "next/navigation";

// Allowed roles that can access this page
const ALLOWED_ROLES = ["Developer", "SuperAdmin", "Administrator", "Program Chair", "Faculty"];

// Category options for suggestions
const CATEGORIES = [
  { id: "feature", label: "New Feature", icon: Lightbulb, color: "text-blue-500" },
  { id: "improvement", label: "Improvement", icon: MessageSquarePlus, color: "text-green-500" },
  { id: "bug", label: "Bug Report", icon: AlertTriangle, color: "text-red-500" },
  { id: "other", label: "Other", icon: Tag, color: "text-gray-500" },
];

// Status options (for developer view)
const STATUSES = [
  { id: "pending", label: "Pending", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { id: "reviewed", label: "Reviewed", icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "approved", label: "Approved", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  { id: "rejected", label: "Rejected", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
];

interface Suggestion {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  submitted_by: string;
  submitted_by_role: string;
  submitted_by_email: string;
  created_at: string;
  developer_notes?: string;
}

// Accent color mapping
const accentColorMap: Record<string, { gradient: string; bg: string; text: string; border: string }> = {
  orange: { gradient: "from-orange-500 to-amber-500", bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500" },
  blue: { gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500" },
  purple: { gradient: "from-purple-500 to-pink-500", bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500" },
  emerald: { gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500" },
  rose: { gradient: "from-rose-500 to-red-500", bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500" },
  indigo: { gradient: "from-indigo-500 to-violet-500", bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500" },
};

const isHexColor = (color: string) => /^#([0-9A-F]{3}){1,2}$/i.test(color);

export default function SuggestionsPage() {
  const { role } = useRole();
  const { accent } = useTheme();
  const { showAlert, showConfirm } = usePopup();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");

  // Filter state (for developer view)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Dropdown states
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  
  // Refs for dropdown containers
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Selected suggestion for detail view
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [developerNotes, setDeveloperNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isDeveloper = role === "Developer";
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get accent colors
  const isCustomHex = isHexColor(accent);
  const accentColors = !isCustomHex ? accentColorMap[accent] || accentColorMap.orange : null;

  // Check access and fetch data
  useEffect(() => {
    const checkAccessAndFetch = async () => {
      // Check if role is allowed
      if (!ALLOWED_ROLES.includes(role)) {
        showAlert({
          title: "Access Denied",
          message: "You don't have permission to access this page.",
          variant: "error",
        });
        router.push("/dashboard");
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, username, email")
          .eq("id", user.id)
          .single();
        
        if (userData) {
          setCurrentUser(userData);
        }
      }

      // Fetch suggestions
      await fetchSuggestions();
      setLoading(false);
    };

    checkAccessAndFetch();
  }, [role, router, showAlert]);

  const fetchSuggestions = async () => {
    try {
      let query = supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      // Non-developers only see their own suggestions
      if (!isDeveloper && currentUser) {
        query = query.eq("submitted_by", currentUser.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Re-fetch when user changes
  useEffect(() => {
    if (currentUser) {
      fetchSuggestions();
    }
  }, [currentUser, isDeveloper]);

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.submitted_by_email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [suggestions, searchQuery, statusFilter, categoryFilter]);

  // Submit new suggestion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      showAlert({
        title: "Missing Fields",
        message: "Please fill in both title and description.",
        variant: "error",
      });
      return;
    }

    if (!currentUser) {
      showAlert({
        title: "Error",
        message: "User not found. Please refresh the page.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("suggestions").insert({
        title: title.trim(),
        description: description.trim(),
        category,
        status: "pending",
        submitted_by: currentUser.id,
        submitted_by_role: role,
        submitted_by_email: currentUser.email,
      });

      if (error) throw error;

      showAlert({
        title: "Suggestion Submitted!",
        message: "Thank you for your feedback. The developer will review it soon.",
        variant: "success",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("feature");

      // Refresh list
      await fetchSuggestions();
    } catch (error) {
      console.error("Error submitting suggestion:", error);
      showAlert({
        title: "Error",
        message: "Failed to submit suggestion. Please try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update suggestion status (developer only)
  const handleUpdateStatus = async (suggestionId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("suggestions")
        .update({
          status: newStatus,
          developer_notes: developerNotes,
        })
        .eq("id", suggestionId);

      if (error) throw error;

      showAlert({
        title: "Status Updated",
        message: `Suggestion marked as ${newStatus}.`,
        variant: "success",
      });

      setSelectedSuggestion(null);
      setDeveloperNotes("");
      await fetchSuggestions();
    } catch (error) {
      console.error("Error updating status:", error);
      showAlert({
        title: "Error",
        message: "Failed to update status.",
        variant: "error",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete suggestion (developer only)
  const handleDelete = async (suggestionId: number) => {
    const confirmed = await showConfirm({
      title: "Delete Suggestion",
      message: "Are you sure you want to delete this suggestion? This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .eq("id", suggestionId);

      if (error) throw error;

      showAlert({
        title: "Deleted",
        message: "Suggestion has been deleted.",
        variant: "success",
      });

      setSelectedSuggestion(null);
      await fetchSuggestions();
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      showAlert({
        title: "Error",
        message: "Failed to delete suggestion.",
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Access denied
  if (!ALLOWED_ROLES.includes(role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div
              className={`p-2 rounded-xl bg-gradient-to-br ${
                isCustomHex ? "" : accentColors?.gradient
              }`}
              style={isCustomHex ? { background: `linear-gradient(to bottom right, ${accent}, ${accent}dd)` } : undefined}
            >
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            {isDeveloper ? "Feature Suggestions" : "Submit a Suggestion"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isDeveloper
              ? "Review and manage feature suggestions from users"
              : "Share your ideas to help improve the system"}
          </p>
        </div>
      </div>

      <div className={`grid ${isDeveloper ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-6`}>
        {/* Submit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isDeveloper ? "lg:col-span-1" : "lg:col-span-1"} bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6`}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            New Suggestion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for your suggestion"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={isCustomHex ? { "--tw-ring-color": accent } as React.CSSProperties : undefined}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      category === cat.id
                        ? "border-2 bg-gray-100 dark:bg-gray-800"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    style={
                      category === cat.id && isCustomHex
                        ? { borderColor: accent }
                        : category === cat.id
                        ? { borderColor: accentColors?.bg.replace("bg-", "") }
                        : undefined
                    }
                  >
                    <cat.icon className={`w-4 h-4 ${cat.color}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your suggestion in detail..."
                rows={5}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all ${
                submitting ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              } bg-gradient-to-r ${isCustomHex ? "" : accentColors?.gradient}`}
              style={isCustomHex ? { background: `linear-gradient(to right, ${accent}, ${accent}dd)` } : undefined}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Suggestion
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Suggestions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${isDeveloper ? "lg:col-span-2" : "lg:col-span-1"} bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {isDeveloper ? "All Suggestions" : "Your Suggestions"}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredSuggestions.length} {filteredSuggestions.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Filters (Developer Only) */}
          {isDeveloper && (
            <div className="flex flex-wrap gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suggestions..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative" ref={statusDropdownRef}>
                <button 
                  onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setCategoryDropdownOpen(false); }}
                  className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                >
                  <Filter size={14} className="text-gray-500" />
                  <span className="text-white text-sm font-medium">
                    {statusFilter === "all" ? "All Status" : STATUSES.find(s => s.id === statusFilter)?.label}
                  </span>
                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {statusDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => { setStatusFilter("all"); setStatusDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                          statusFilter === "all" 
                            ? 'bg-indigo-500/20 text-indigo-400' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        All Status
                        {statusFilter === "all" && <CheckCircle size={14} />}
                      </button>
                      {STATUSES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setStatusFilter(s.id); setStatusDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                            statusFilter === s.id 
                              ? 'bg-indigo-500/20 text-indigo-400' 
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {s.label}
                          {statusFilter === s.id && <CheckCircle size={14} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Category Filter Dropdown */}
              <div className="relative" ref={categoryDropdownRef}>
                <button 
                  onClick={() => { setCategoryDropdownOpen(!categoryDropdownOpen); setStatusDropdownOpen(false); }}
                  className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                >
                  <Tag size={14} className="text-gray-500" />
                  <span className="text-white text-sm font-medium">
                    {categoryFilter === "all" ? "All Categories" : CATEGORIES.find(c => c.id === categoryFilter)?.label}
                  </span>
                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {categoryDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => { setCategoryFilter("all"); setCategoryDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                          categoryFilter === "all" 
                            ? 'bg-indigo-500/20 text-indigo-400' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        All Categories
                        {categoryFilter === "all" && <CheckCircle size={14} />}
                      </button>
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCategoryFilter(c.id); setCategoryDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                            categoryFilter === c.id 
                              ? 'bg-indigo-500/20 text-indigo-400' 
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {c.label}
                          {categoryFilter === c.id && <CheckCircle size={14} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Suggestions List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filteredSuggestions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isDeveloper ? "No suggestions yet" : "You haven't submitted any suggestions yet"}</p>
              </div>
            ) : (
              filteredSuggestions.map((suggestion) => {
                const categoryInfo = CATEGORIES.find((c) => c.id === suggestion.category) || CATEGORIES[0];
                const statusInfo = STATUSES.find((s) => s.id === suggestion.status) || STATUSES[0];
                const CategoryIcon = categoryInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedSuggestion(suggestion);
                      setDeveloperNotes(suggestion.developer_notes || "");
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CategoryIcon className={`w-4 h-4 ${categoryInfo.color}`} />
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {suggestion.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {suggestion.description}
                        </p>
                        {isDeveloper && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {suggestion.submitted_by_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(suggestion.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSuggestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedSuggestion(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const categoryInfo = CATEGORIES.find((c) => c.id === selectedSuggestion.category) || CATEGORIES[0];
                const statusInfo = STATUSES.find((s) => s.id === selectedSuggestion.status) || STATUSES[0];
                const CategoryIcon = categoryInfo.icon;

                return (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className={`w-5 h-5 ${categoryInfo.color}`} />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{categoryInfo.label}</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {selectedSuggestion.title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">
                      {selectedSuggestion.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {selectedSuggestion.submitted_by_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {selectedSuggestion.submitted_by_role}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedSuggestion.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Developer Controls */}
                    {isDeveloper && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Developer Notes
                          </label>
                          <textarea
                            value={developerNotes}
                            onChange={(e) => setDeveloperNotes(e.target.value)}
                            placeholder="Add notes about this suggestion..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Update Status
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {STATUSES.map((status) => (
                              <button
                                key={status.id}
                                onClick={() => handleUpdateStatus(selectedSuggestion.id, status.id)}
                                disabled={updatingStatus}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${status.color} ${status.bg} hover:opacity-80 disabled:opacity-50`}
                              >
                                <status.icon className="w-4 h-4" />
                                {status.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(selectedSuggestion.id)}
                          className="w-full mt-4 py-2 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Suggestion
                        </button>
                      </div>
                    )}

                    {/* Non-developer view: show developer notes if any */}
                    {!isDeveloper && selectedSuggestion.developer_notes && (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                          Developer Response
                        </h4>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          {selectedSuggestion.developer_notes}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedSuggestion(null)}
                      className="w-full mt-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                      Close
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
