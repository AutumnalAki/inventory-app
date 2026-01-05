"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, User, Shield, Trash2, Key, Copy, Loader2, X, 
  Eye, Lock, Power, Edit2, ChevronDown, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { usePopup } from "@/context/PopupContext";

// All Roles (for display)
const ROLES = [
  "Developer",
  "Tester",
  "Administrator",
  "Program Chair",
  "Faculty",
  "ME Lab",
  "CE Lab",
  "ECE Lab",
  "CPE Lab",
  "CHEM Lab",
  "PHYS Lab",
  "EE Lab"
];

// Role Hierarchy Levels (higher number = higher authority)
const ROLE_HIERARCHY: Record<string, number> = {
  "Developer": 100,      // Apex - cannot be touched
  "Tester": 90,          // Special role, managed by Developer only
  "Administrator": 80,   // Second
  "Program Chair": 60,   // Third
  "Faculty": 60,         // Third (same level as Program Chair)
  "ME Lab": 40,          // Lab accounts (lowest)
  "CE Lab": 40,
  "ECE Lab": 40,
  "CPE Lab": 40,
  "CHEM Lab": 40,
  "PHYS Lab": 40,
  "EE Lab": 40,
};

// Get role level (default to lowest if unknown)
const getRoleLevel = (role: string): number => ROLE_HIERARCHY[role] ?? 0;

// Check if current user can manage target user
const canManageUser = (currentUserRole: string, targetUserRole: string): boolean => {
  const currentLevel = getRoleLevel(currentUserRole);
  const targetLevel = getRoleLevel(targetUserRole);
  
  // Developer cannot be managed by anyone
  if (targetUserRole === "Developer") return false;
  
  // Can only manage users with strictly lower role level
  return currentLevel > targetLevel;
};

// Selectable Roles: Only Developer can assign Tester, others can't see or assign Tester
const SELECTABLE_ROLES = (currentUserRole?: string) => {
  if (currentUserRole === "Developer") {
    return ROLES.filter(role => role !== "Developer"); // Developer can assign Tester
  }
  return ROLES.filter(role => role !== "Developer" && role !== "Tester");
};

export default function MembersPage() {
  const { showAlert, showConfirm } = usePopup();
  
  const [users, setUsers] = useState<any[]>([]);
  const [activeCodes, setActiveCodes] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null); // To prevent deleting self
  const [currentUserRole, setCurrentUserRole] = useState<string>(""); // Current user's role for permissions
  
  // --- STATES FOR GENERATE MODAL ---
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(SELECTABLE_ROLES(currentUserRole)[0]); 
  const [customCode, setCustomCode] = useState("");
  const [generatePassword, setGeneratePassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // --- STATES FOR REVEAL SECURITY ---
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [codeToReveal, setCodeToReveal] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState("");
  
  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (editRoleDropdownRef.current && !editRoleDropdownRef.current.contains(event.target as Node)) {
        setEditRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [verifying, setVerifying] = useState(false);
  const [revealedCodeIds, setRevealedCodeIds] = useState<Set<string>>(new Set());

  // --- STATES FOR EDIT USER MODAL ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [editRoleDropdownOpen, setEditRoleDropdownOpen] = useState(false);
  const editRoleDropdownRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    
    // Get Current User (to avoid self-actions)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      setCurrentUser(authUser);
      
      // Fetch current user's role from users table
      const { data: currentUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      if (currentUserData) {
        setCurrentUserRole(currentUserData.role || "");
      }
    }

    // Fetch Users
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (userData) setUsers(userData);

    // Fetch Invite Codes
    const { data: codeData } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (codeData) setActiveCodes(codeData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- MEMBER ACTIONS ---

  // 1. Toggle Active/Inactive Status
  const handleToggleStatus = async (userId: string, currentStatus: string, targetRole: string) => {
    // Check permission
    if (!canManageUser(currentUserRole, targetRole)) {
      showAlert({ 
        title: "Access Denied", 
        message: `You don't have permission to ${currentStatus === 'active' ? 'deactivate' : 'activate'} a ${targetRole}.`, 
        variant: "error" 
      });
      return;
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? "Activate" : "Deactivate";
    
    const isConfirmed = await showConfirm({
      title: `${action} User?`,
      message: `Are you sure you want to ${action.toLowerCase()} this user?`,
      variant: newStatus === 'active' ? 'info' : 'danger',
      confirmText: `Yes, ${action}`,
    });

    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      
      // Update local state immediately for speed
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      
      showAlert({ title: "Success", message: `User marked as ${newStatus}.`, variant: "success" });
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message, variant: "error" });
    }
  };

  // 2. Delete User
  const handleDeleteUser = async (userId: string, targetRole: string) => {
    // Check permission
    if (!canManageUser(currentUserRole, targetRole)) {
      showAlert({ 
        title: "Access Denied", 
        message: `You don't have permission to delete a ${targetRole}.`, 
        variant: "error" 
      });
      return;
    }

    const isConfirmed = await showConfirm({
      title: "Delete User?",
      message: "This action cannot be undone. The user will be permanently removed.",
      variant: "danger",
      confirmText: "Delete Forever",
    });

    if (!isConfirmed) return;

    try {
      // Delete from Supabase Auth via API route
      const authResponse = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId: userId })
      });
      
      if (!authResponse.ok) {
        const authError = await authResponse.json();
        console.error('Auth delete error:', authError);
      }

      // Delete from users table
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));
      showAlert({ title: "Deleted", message: "User has been removed.", variant: "success" });
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message, variant: "error" });
    }
  };

  // 3. Edit User Role
  const handleOpenEdit = (user: any) => {
    // Check permission
    if (!canManageUser(currentUserRole, user.role)) {
      showAlert({ 
        title: "Access Denied", 
        message: `You don't have permission to edit a ${user.role}.`, 
        variant: "error" 
      });
      return;
    }
    
    setEditingUser(user);
    setEditRole(user.role || "");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: editRole })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, role: editRole } : u));
      showAlert({ title: "Success", message: "User role updated successfully.", variant: "success" });
      setIsEditOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };


  // --- CODE ACTIONS (Generate/Reveal) ---

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Not authenticated");
      
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: generatePassword });
      if (authError) { 
        showAlert({ title: "Access Denied", message: "Incorrect Admin Password.", variant: "error" });
        setGenerating(false); 
        return; 
      }
      
      const finalCode = customCode.trim() || `${selectedRole.toUpperCase().replace(/\s/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: dbError } = await supabase.from('access_codes').insert([{ code: finalCode, role: selectedRole, created_by: user.id }]);
      if (dbError) throw dbError;

      showAlert({ title: "Code Generated", message: `Invite Code: ${finalCode}`, variant: "success" });
      setIsGenerateOpen(false); setGeneratePassword(""); fetchData();
    } catch (err: any) { 
      showAlert({ title: "Error", message: err.message, variant: "error" });
    } finally { 
      setGenerating(false); 
    }
  };

  const initiateReveal = (codeId: string) => { setCodeToReveal(codeId); setRevealPassword(""); setIsRevealOpen(true); };
  
  const handleRevealConfirm = async (e: React.FormEvent) => {
    e.preventDefault(); setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Not authenticated");
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: revealPassword });
      if (authError) { 
        showAlert({ title: "Access Denied", message: "Incorrect Admin Password.", variant: "error" });
        setVerifying(false); 
        return; 
      }
      if (codeToReveal) { setRevealedCodeIds(prev => new Set(prev).add(codeToReveal)); setIsRevealOpen(false); }
    } catch (err: any) { 
       showAlert({ title: "Error", message: err.message, variant: "error" });
    } finally { setVerifying(false); }
  };

  const handleDeleteCode = async (id: string) => { 
    const confirmed = await showConfirm({ title: "Revoke Invite?", message: "Users will no longer be able to use this code.", variant: "danger" });
    if (!confirmed) return;
    await supabase.from('access_codes').delete().eq('id', id); fetchData(); 
  };

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Members & Access</h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">Manage users and secure invite codes.</p>
        </div>
        <button onClick={() => setIsGenerateOpen(true)} data-tour="generate-code-btn" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 text-sm w-full sm:w-auto justify-center">
          <Key size={16} className="md:w-[18px] md:h-[18px]" /> Generate Invite
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 flex-1 min-h-0">
        
        {/* LEFT: User List */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col">
          <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
            <User size={16} className="md:w-[18px] md:h-[18px] text-indigo-400"/> Registered Members
          </h3>
          
          <div className="relative mb-3 md:mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg md:rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="overflow-y-auto flex-1 pr-1 md:pr-2 space-y-2 no-scrollbar">
            {users
              .filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
              .filter(u => currentUserRole === 'Developer' || u.role !== 'Tester')
              .sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role))
              .map((user) => {
               const isActive = user.status === 'active';
               const isMe = currentUser?.id === user.id;
               const isProtected = !canManageUser(currentUserRole, user.role);
               const isDeveloper = user.role === 'Developer';
               const isAdmin = user.role === 'Administrator';
               const isProgramChair = user.role === 'Program Chair';
               const isFaculty = user.role === 'Faculty';
               const isTester = user.role === 'Tester';

               // Get row background based on role and status
               const getRowStyle = () => {
                 if (!isActive) return 'bg-red-900/10 border-red-900/20';
                 if (isDeveloper) return 'bg-cyan-500/5 border-cyan-500/20';
                 if (isTester) return 'bg-yellow-500/5 border-yellow-500/20';
                 if (isAdmin) return 'bg-orange-500/5 border-orange-500/20';
                 if (isProgramChair) return 'bg-purple-500/5 border-purple-500/20';
                 if (isFaculty) return 'bg-pink-500/5 border-pink-500/20';
                 return 'bg-white/5 border-white/5 hover:bg-white/10';
               };

               return (
                <div key={user.id} className={`flex items-center justify-between p-2.5 md:p-3 rounded-lg md:rounded-xl border transition-colors ${getRowStyle()}`}>
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-lg shrink-0 ${
                      user.role === 'Developer' ? 'bg-cyan-500 text-white' : 
                      user.role === 'Tester' ? 'bg-yellow-500 text-white' :
                      user.role === 'Administrator' ? 'bg-orange-500 text-white' : 
                      user.role === 'Program Chair' ? 'bg-purple-500 text-white' :
                      user.role === 'Faculty' ? 'bg-pink-500 text-white' :
                      'bg-indigo-600 text-white'
                    }`}>
                      {user.username?.charAt(0) || "U"}
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-[#111] ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                         <p className={`font-bold text-xs md:text-sm truncate ${isActive ? 'text-white' : 'text-gray-400 line-through'}`}>{user.username}</p>
                         {isDeveloper && <span title="Protected Account"><Shield size={12} className="text-cyan-400 shrink-0" /></span>}
                         {isTester && <span title="Tester Account"><Shield size={12} className="text-yellow-400 shrink-0" /></span>}
                         {!isActive && <span className="text-[9px] md:text-[10px] bg-red-500/20 text-red-400 px-1 md:px-1.5 py-0.5 rounded uppercase font-bold shrink-0">Inactive</span>}
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 md:gap-2 shrink-0">
                    <span className={`hidden lg:inline-block text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border font-medium mr-1 md:mr-2 ${
                      isDeveloper ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      isTester ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      user.role === 'Administrator' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      user.role === 'Program Chair' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      user.role === 'Faculty' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                      'bg-white/10 text-gray-300 border-white/5'
                    }`}>
                      {user.role}
                    </span>

                    {!isMe && (
                      <div data-tour="user-actions" className="flex items-center">
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          title={canManageUser(currentUserRole, user.role) ? "Edit User Role" : `Cannot edit ${user.role}`}
                          disabled={!canManageUser(currentUserRole, user.role)}
                          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                            canManageUser(currentUserRole, user.role)
                              ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                              : 'text-gray-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <Edit2 size={14} className="md:w-4 md:h-4" />
                        </button>

                        <button 
                          onClick={() => handleToggleStatus(user.id, user.status, user.role)}
                          title={canManageUser(currentUserRole, user.role) 
                            ? (isActive ? "Deactivate User" : "Activate User")
                            : `Cannot ${isActive ? 'deactivate' : 'activate'} ${user.role}`
                          }
                          disabled={!canManageUser(currentUserRole, user.role)}
                          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                            !canManageUser(currentUserRole, user.role)
                              ? 'text-gray-600 cursor-not-allowed opacity-50'
                              : isActive 
                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' 
                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power size={14} className="md:w-4 md:h-4" />
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(user.id, user.role)}
                          title={canManageUser(currentUserRole, user.role) ? "Delete User" : `Cannot delete ${user.role}`}
                          disabled={!canManageUser(currentUserRole, user.role)}
                          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                            canManageUser(currentUserRole, user.role)
                              ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                              : 'text-gray-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <Trash2 size={14} className="md:w-4 md:h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        </div>

        {/* RIGHT: Active Invites (Secure View) */}
        <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col" data-tour="invite-codes-section">
           <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
            <Key size={16} className="md:w-[18px] md:h-[18px] text-emerald-400"/> Active Invites
          </h3>
          <div className="overflow-y-auto flex-1 pr-1 md:pr-2 space-y-2 md:space-y-3 no-scrollbar">
            {activeCodes.length === 0 && <p className="text-gray-500 text-sm italic">No active invite codes.</p>}
            {activeCodes.map((invite) => {
              const isRevealed = revealedCodeIds.has(invite.id);
              return (
                <div key={invite.id} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 group relative">
                  <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{invite.role}</span>
                      <button onClick={() => handleDeleteCode(invite.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-emerald-500/10">
                      {isRevealed ? (
                        <>
                          <code className="text-sm font-mono text-white tracking-wider">{invite.code}</code>
                          <button onClick={() => navigator.clipboard.writeText(invite.code)} className="text-gray-400 hover:text-white" title="Copy Code"><Copy size={14}/></button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-mono text-gray-500 tracking-widest">••••••••••••</span>
                          <button onClick={() => initiateReveal(invite.id)} className="text-gray-400 hover:text-emerald-400 transition-colors" title="Reveal Code"><Eye size={16}/></button>
                        </>
                      )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 text-right">Created {new Date(invite.created_at).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- MODAL 1: GENERATE CODE --- */}
      <AnimatePresence>
        {isGenerateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 rounded-2xl w-full min-w-[480px] max-w-3xl h-[480px] overflow-visible shadow-2xl z-[1200] p-10">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Create Invite Code</h2>
                  <button onClick={() => setIsGenerateOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleGenerateCode} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Assign Role</label>
                        <div className="relative" ref={roleDropdownRef}>
                          <button 
                            type="button"
                            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                            className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm hover:border-white/20 transition-colors"
                          >
                            <span>{selectedRole}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {roleDropdownOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                                animate={{ opacity: 1, y: 0, scale: 1 }} 
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto no-scrollbar"
                              >
                                {SELECTABLE_ROLES(currentUserRole).map((role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => { setSelectedRole(role); setRoleDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                      selectedRole === role 
                                        ? 'bg-indigo-500/20 text-indigo-400' 
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    {role}
                                    {selectedRole === role && <CheckCircle size={14} />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Custom Code (Optional)</label>
                        <input type="text" placeholder="Leave empty to auto-generate" value={customCode} onChange={(e) => setCustomCode(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-gray-600" />
                    </div>
                    <div className="my-4 border-t border-white/10" />
                    <div className="space-y-1.5 bg-red-900/10 p-3 rounded-xl border border-red-500/20">
                        <label className="text-xs font-bold text-red-400 uppercase flex items-center gap-2"><Shield size={12}/> Security Verification</label>
                        <p className="text-[10px] text-gray-400 mb-2">Enter your admin password to generate this code.</p>
                        <input required type="password" placeholder="Admin Password" value={generatePassword} onChange={(e) => setGeneratePassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsGenerateOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-gray-300 transition-colors">Cancel</button>
                        <button type="submit" disabled={generating} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                            {generating ? <Loader2 className="animate-spin" size={16} /> : "Generate Code"}
                        </button>
                    </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: REVEAL CODE --- */}
      <AnimatePresence>
        {isRevealOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-red-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="bg-red-500/10 p-3 rounded-full mb-3 text-red-500"><Lock size={24} /></div>
                  <h2 className="text-xl font-bold text-white">Restricted Access</h2>
                  <p className="text-xs text-gray-400 mt-1">Enter password to reveal this invite code.</p>
                </div>
                <form onSubmit={handleRevealConfirm} className="space-y-4">
                    <input autoFocus required type="password" placeholder="Admin Password" value={revealPassword} onChange={(e) => setRevealPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-lg tracking-widest focus:outline-none focus:border-red-500" />
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsRevealOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-gray-300 transition-colors">Cancel</button>
                        <button type="submit" disabled={verifying} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                            {verifying ? <Loader2 className="animate-spin" size={16} /> : "Unlock Code"}
                        </button>
                    </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: EDIT USER ROLE --- */}
      <AnimatePresence>
        {isEditOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Edit User Role</h2>
                  <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${editingUser.role === 'Developer' ? 'bg-cyan-500' : editingUser.role === 'Administrator' ? 'bg-orange-500' : 'bg-indigo-600'} text-white`}>
                    {editingUser.username?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-white">{editingUser.username}</p>
                    <p className="text-xs text-gray-400">{editingUser.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">New Role</label>
                    <div className="relative" ref={editRoleDropdownRef}>
                      <button 
                        type="button"
                        onClick={() => setEditRoleDropdownOpen(!editRoleDropdownOpen)}
                        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm hover:border-white/20 transition-colors"
                      >
                        <span>{editRole}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${editRoleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {editRoleDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[120000] backdrop-blur-lg overflow-visible max-h-96 overflow-y-auto no-scrollbar min-w-[320px] p-2"
                          >
                            {SELECTABLE_ROLES(currentUserRole).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => { setEditRole(role); setEditRoleDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                  editRole === role 
                                    ? 'bg-blue-500/20 text-blue-400' 
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                {role}
                                {editRole === role && <CheckCircle size={14} />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditOpen(false)} 
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit} 
                      disabled={saving || editRole === editingUser.role}
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 className="animate-spin" size={16} /> : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}