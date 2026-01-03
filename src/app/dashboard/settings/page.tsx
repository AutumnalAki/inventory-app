"use client";

import React, { useState } from "react";
import { 
  User, Lock, Mail, Save, Moon, Sun, 
  Monitor, Bell, Shield, Palette, Check, AlertCircle 
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  // --- Profile State ---
  const [profile, setProfile] = useState({
    name: "Dr. Admin User",
    email: "admin@school.edu",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // --- Theme State ---
  const [themeMode, setThemeMode] = useState("dark"); 
  const [accentColor, setAccentColor] = useState("orange");

  // --- Notifications State ---
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    browserPush: false,
    lowStock: true,
    returns: true
  });

  // --- Handlers ---
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Profile settings saved successfully! (Demo)");
  };

  const colors = [
    { id: "orange", label: "CDM Orange", bg: "bg-orange-500", ring: "ring-orange-500" },
    { id: "blue", label: "Ocean Blue", bg: "bg-blue-500", ring: "ring-blue-500" },
    { id: "purple", label: "Royal Purple", bg: "bg-purple-500", ring: "ring-purple-500" },
    { id: "emerald", label: "Tech Emerald", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  ];

  return (
    // Reduced outer padding and max width for a tighter fit
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      
      {/* Compact Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-400 text-xs mt-0.5">Manage your account preferences and dashboard appearance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
        
        {/* --- LEFT COLUMN: Navigation (Compact) --- */}
        <div className="hidden lg:block space-y-1">
            <button className="w-full text-left px-3 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium border border-white/10 flex items-center gap-3">
                <User size={16} /> Profile & Account
            </button>
            <button className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-3">
                <Palette size={16} /> Appearance
            </button>
            <button className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-3">
                <Bell size={16} /> Notifications
            </button>
            <button className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-3">
                <Shield size={16} /> Security
            </button>
        </div>

        {/* --- RIGHT COLUMN: Content (Scrollable if needed, but fits better now) --- */}
        <div className="lg:col-span-3 space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
          
          {/* 1. PROFILE SECTION */}
          <section className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-200 uppercase tracking-wider">
                <User className="text-indigo-400" size={16} /> 
                Profile Information
            </h2>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Display Name</label>
                        <input 
                          type="text" 
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Email Address</label>
                        <div className="relative">
                            <input 
                            disabled
                            type="email" 
                            value={profile.email}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                            />
                            <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" />
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                    <h3 className="text-xs font-bold text-gray-400 mb-3">Change Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <div className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Current Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">New Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Confirm Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button type="submit" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/20">
                        <Save size={14} />
                        Save Changes
                    </button>
                </div>
            </form>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2. APPEARANCE SECTION */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm h-full">
                <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-200 uppercase tracking-wider">
                    <Palette className="text-pink-400" size={16} /> 
                    Appearance
                </h2>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Theme</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setThemeMode("dark")} className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs ${themeMode === "dark" ? "bg-white/10 border-indigo-500 text-white" : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"}`}>
                                <Moon size={12} /> Dark
                            </button>
                            <button disabled className="flex items-center justify-center gap-2 py-2 rounded-lg border border-white/5 bg-black/20 text-gray-600 cursor-not-allowed text-xs relative overflow-hidden">
                                <Sun size={12} /> Light
                            </button>
                            <button onClick={() => setThemeMode("system")} className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs ${themeMode === "system" ? "bg-white/10 border-indigo-500 text-white" : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"}`}>
                                <Monitor size={12} /> Auto
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Accent Color</label>
                        <div className="flex flex-wrap gap-3">
                            {colors.map((c) => (
                                <button key={c.id} onClick={() => setAccentColor(c.id)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${c.bg} ${accentColor === c.id ? `ring-2 ${c.ring} ring-offset-2 ring-offset-black scale-110` : "hover:scale-110 opacity-70 hover:opacity-100"}`}>
                                    {accentColor === c.id && <Check size={14} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. NOTIFICATIONS */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm h-full">
                <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-200 uppercase tracking-wider">
                    <Bell className="text-amber-400" size={16} /> 
                    Notifications
                </h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400"><Mail size={14} /></div>
                            <div>
                                <p className="text-xs font-bold text-white">Email Alerts</p>
                                <p className="text-[10px] text-gray-500">Daily summaries.</p>
                            </div>
                        </div>
                        <ToggleSwitch checked={notifications.emailAlerts} onChange={() => setNotifications({...notifications, emailAlerts: !notifications.emailAlerts})} />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-red-500/10 rounded text-red-400"><AlertCircle size={14} /></div>
                            <div>
                                <p className="text-xs font-bold text-white">Low Stock</p>
                                <p className="text-[10px] text-gray-500">Critical level alerts.</p>
                            </div>
                        </div>
                        <ToggleSwitch checked={notifications.lowStock} onChange={() => setNotifications({...notifications, lowStock: !notifications.lowStock})} />
                    </div>
                </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean, onChange: () => void }) {
    return (
        <button onClick={onChange} className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${checked ? "bg-indigo-600" : "bg-gray-700"}`}>
            <motion.div animate={{ x: checked ? 16 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
        </button>
    )
}