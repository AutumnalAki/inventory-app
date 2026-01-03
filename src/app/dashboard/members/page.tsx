"use client";

import React, { useState } from "react";
import { 
  Search, Plus, Filter, Shield, 
  Mail, User, CheckCircle, XCircle, Ban, 
  Lock, Edit2, Trash2, X, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/context/RoleContext"; 
import { useInventory, User as UserType } from "@/context/InventoryContext"; // 1. Import from Context

const ROLES = ["Administrator", "Program Chair", "Faculty", "Student", "Lab Technician"];

export default function MembersPage() {
  const { role: currentUserRole } = useRole();
  
  // 2. Get Real Data & Actions from Context
  const { users, addUser, updateUser, deleteUser } = useInventory();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  
  // Modal & Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Student",
    password: "", 
  });

  const canManageUsers = ["Administrator", "Program Chair"].includes(currentUserRole);

  // --- Filtering ---
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "All" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // --- Handlers ---
  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ name: "", email: "", role: "Student", password: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserType) => {
    setIsEditing(true);
    setCurrentUserId(user.id);
    setFormData({ 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        password: "" 
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && currentUserId !== null) {
        // UPDATE REAL USER
        await updateUser(currentUserId, {
            name: formData.name,
            email: formData.email,
            role: formData.role
        });
    } else {
        // CREATE REAL USER
        await addUser({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            status: "Active"
        }, formData.password);
    }
    
    setIsModalOpen(false);
  };

  const toggleStatus = async (user: UserType) => {
    if (!canManageUsers) return;
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    await updateUser(user.id, { status: newStatus });
  };

  const handleDelete = async (id: number) => {
    if (!canManageUsers) return;
    if(confirm("Are you sure you want to remove this user? This action cannot be undone.")) {
      await deleteUser(id);
    }
  };

  // --- UNAUTHORIZED VIEW ---
  if (!canManageUsers) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
        <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <Lock size={64} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">
            You do not have permission to view the Members directory. 
          </p>
        </div>
      </div>
    );
  }

  // --- AUTHORIZED VIEW ---
  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-gray-400 mt-1">Manage registered users, roles, and account access.</p>
      </div>

      <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors">
            <Filter size={14} className="text-gray-500" />
            <span className="text-gray-400 text-xs hidden sm:inline">Role:</span>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer">
              <option value="All" className="bg-gray-900">All Roles</option>
              {ROLES.map(role => (<option key={role} value={role} className="bg-gray-900">{role}</option>))}
            </select>
          </div>
        </div>

        <button onClick={openAddModal} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 w-full md:w-auto">
          <Plus size={16} /> Add New User
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                <th className="p-4 w-[25%]">Name</th>
                <th className="p-4 w-[25%]">Email</th>
                <th className="p-4 w-[15%]">Role</th>
                <th className="p-4 w-[15%]">Status</th>
                <th className="p-4 w-[15%]">Joined</th>
                <th className="p-4 text-right w-[5%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-white/[0.07] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                            {user.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 font-medium">{user.email}</td>
                    <td className="p-4"><RoleBadge role={user.role} /></td>
                    <td className="p-4">
                         <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${user.status === "Active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                             {user.status === "Active" ? <CheckCircle size={10} /> : <Ban size={10} />}
                             <span className="text-[10px] font-bold">{user.status}</span>
                         </div>
                    </td>
                    <td className="p-4 text-gray-500 tabular-nums">{user.joined}</td>
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                           <button onClick={() => openEditModal(user)} className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"><Edit2 size={14} /></button>
                           <button onClick={() => toggleStatus(user)} className={`p-2 rounded-lg transition-all ${user.status === "Active" ? "hover:bg-amber-500/10 text-gray-500 hover:text-amber-400" : "hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400"}`}>
                             {user.status === "Active" ? <XCircle size={14} /> : <CheckCircle size={14} />}
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <h2 className="text-lg font-bold text-white">{isEditing ? "Edit User Details" : "Add New User"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Full Name</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><input required type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" /></div></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Email Address</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><input required type="email" placeholder="john@school.edu" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" /></div></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">Assign Role</label><div className="relative"><Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer">{ROLES.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}</select></div></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-400 uppercase">{isEditing ? "Reset Password (Optional)" : "Temporary Password"}</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!isEditing} className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" /></div></div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Cancel</button><button type="submit" className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-900/20"><Save size={16} />{isEditing ? "Update User" : "Create Account"}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = { "Administrator": "bg-purple-500/10 text-purple-400 border-purple-500/20", "Program Chair": "bg-orange-500/10 text-orange-400 border-orange-500/20", "Faculty": "bg-blue-500/10 text-blue-400 border-blue-500/20", "Student": "bg-white/5 text-gray-400 border-white/10" };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${styles[role] || styles["Student"]}`}>{role}</span>;
}