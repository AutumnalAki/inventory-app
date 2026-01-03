"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, User, Shield, Trash2, Key, Copy, Loader2, X, 
  Eye, Lock, Power
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { usePopup } from "@/context/PopupContext";

// Roles List
const ROLES = [
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

export default function MembersPage() {
  const { showAlert, showConfirm } = usePopup();
  
  const [users, setUsers] = useState<any[]>([]);
  const [activeCodes, setActiveCodes] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null); // To prevent deleting self
  
  // --- STATES FOR GENERATE MODAL ---
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES[2]); 
  const [customCode, setCustomCode] = useState("");
  const [generatePassword, setGeneratePassword] = useState("");
  const [generating, setGenerating] = useState(false);

  // --- STATES FOR REVEAL SECURITY ---
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [codeToReveal, setCodeToReveal] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [revealedCodeIds, setRevealedCodeIds] = useState<Set<string>>(new Set());

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    
    // Get Current User (to avoid self-actions)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) setCurrentUser(authUser);

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
  const handleToggleStatus = async (userId: string, currentStatus: string) => {
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
  const handleDeleteUser = async (userId: string) => {
    const isConfirmed = await showConfirm({
      title: "Delete User?",
      message: "This action cannot be undone. The user will be permanently removed.",
      variant: "danger",
      confirmText: "Delete Forever",
    });

    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));
      showAlert({ title: "Deleted", message: "User has been removed.", variant: "success" });
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message, variant: "error" });
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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Members & Access</h1>
          <p className="text-gray-400 mt-1">Manage users and secure invite codes.</p>
        </div>
        <button onClick={() => setIsGenerateOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20">
          <Key size={18} /> Generate Invite
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* LEFT: User List */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-indigo-400"/> Registered Members
          </h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="overflow-y-auto flex-1 pr-2 space-y-2 no-scrollbar">
            {users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase())).map((user) => {
               const isActive = user.status === 'active';
               const isMe = currentUser?.id === user.id;

               return (
                <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isActive ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-red-900/10 border-red-900/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.role === 'Administrator' ? 'bg-orange-500 text-white' : 'bg-indigo-600 text-white'}`}>
                      {user.username?.charAt(0) || "U"}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111] ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-400 line-through'}`}>{user.username}</p>
                         {!isActive && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Inactive</span>}
                      </div>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-block text-xs px-2 py-1 rounded-md bg-white/10 text-gray-300 border border-white/5 font-medium mr-2">
                      {user.role}
                    </span>

                    {!isMe && (
                      <>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          title={isActive ? "Deactivate User" : "Activate User"}
                          className={`p-2 rounded-lg transition-colors ${isActive ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'}`}
                        >
                          <Power size={16} />
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        </div>

        {/* RIGHT: Active Invites (Secure View) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-emerald-400"/> Active Invites
          </h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 no-scrollbar">
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Create Invite Code</h2>
                  <button onClick={() => setIsGenerateOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleGenerateCode} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Assign Role</label>
                        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500">
                            {ROLES.map(role => <option key={role} value={role} className="bg-gray-900">{role}</option>)}
                        </select>
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
    </div>
  );
}