"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Lock, Palette, Save, Check, Loader2, Plus 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Lock },
];

const PRESET_THEMES = [
  { id: "orange", label: "Sunset Orange", color: "bg-orange-500" },
  { id: "blue",   label: "Ocean Blue",    color: "bg-blue-500" },
  { id: "purple", label: "Neon Purple",   color: "bg-purple-500" },
  { id: "emerald",label: "Forest Green",  color: "bg-emerald-500" },
  { id: "rose",   label: "Crimson Red",   color: "bg-rose-500" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const { accent, setAccent } = useTheme();

  // User Data State
  const [profileData, setProfileData] = useState({ firstName: "", lastName: "", email: "", bio: "" });
  const [passwordData, setPasswordData] = useState({ new: "", confirm: "" });

  // Load User Data
  useEffect(() => {
    const fetchUserData = async () => {
        const userId = localStorage.getItem("labTrack_userid");
        if (!userId) { setInitialLoading(false); return; }

        const { data } = await supabase.from('users').select('*').eq('id', userId).single();
        if (data) {
            const nameParts = data.username.split(" ");
            setProfileData({
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                email: data.email,
                bio: data.role
            });
        }
        setInitialLoading(false);
    };
    fetchUserData();
  }, []);

  // Check if current accent is a preset
  const isCustomColor = !PRESET_THEMES.some(t => t.id === accent);

  // Handlers
  const handleSaveProfile = async () => {
    setLoading(true);
    const userId = localStorage.getItem("labTrack_userid");
    const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
    await supabase.from('users').update({ username: fullName, email: profileData.email }).eq('id', userId);
    setLoading(false);
    alert("Profile updated!");
  };

  const handleSavePassword = async () => {
    if (passwordData.new !== passwordData.confirm) return alert("Passwords do not match");
    setLoading(true);
    const userId = localStorage.getItem("labTrack_userid");
    await supabase.from('users').update({ password: passwordData.new }).eq('id', userId);
    setLoading(false);
    alert("Password updated!");
  };

  if (initialLoading) return <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-gray-500"/></div>;

  return (
    <div className="space-y-6 h-full flex flex-col max-h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and workspace preferences.</p>
      </div>

      <div className="bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl flex flex-wrap gap-1 w-full shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 flex-1 overflow-y-auto relative shadow-xl backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col"
          >
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-8 max-w-4xl">
                 <h3 className="text-xl font-bold text-white mb-1">Personal Information</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">First Name</label><input type="text" value={profileData.firstName} onChange={(e)=>setProfileData({...profileData, firstName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Last Name</label><input type="text" value={profileData.lastName} onChange={(e)=>setProfileData({...profileData, lastName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"/></div>
                 </div>
                 <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input type="email" value={profileData.email} onChange={(e)=>setProfileData({...profileData, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"/></div>
              </div>
            )}

            {/* --- NEW THEME SELECTOR --- */}
            {activeTab === "appearance" && (
              <div className="space-y-8 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Workspace Theme</h3>
                  <p className="text-gray-400 text-sm">Select a preset or choose a custom color for your dashboard.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Presets */}
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setAccent(theme.id)}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        accent === theme.id 
                          ? "bg-white/10 border-white/50 shadow-lg" 
                          : "bg-black/20 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full ${theme.color} shadow-lg shadow-black/50`} />
                      <div className="text-left">
                        <span className="block font-bold text-white">{theme.label}</span>
                        <span className="text-xs text-gray-400">Gradient</span>
                      </div>
                      {accent === theme.id && <div className="absolute top-4 right-4 text-white"><Check size={18} /></div>}
                    </button>
                  ))}

                  {/* CUSTOM COLOR PICKER */}
                  <div className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${isCustomColor ? "bg-white/10 border-white/50 shadow-lg" : "bg-black/20 border-white/10 hover:bg-white/5"}`}>
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-black/50 border border-white/20">
                         {/* Native Color Input hidden on top */}
                         <input 
                            type="color" 
                            value={isCustomColor ? accent : "#ffffff"}
                            onChange={(e) => setAccent(e.target.value)}
                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                         />
                    </div>
                    <div className="text-left flex-1">
                        <span className="block font-bold text-white">Custom Color</span>
                        <span className="text-xs text-gray-400">Click circle to pick</span>
                    </div>
                     {isCustomColor && <div className="absolute top-4 right-4 text-white"><Check size={18} /></div>}
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
               <div className="space-y-8 max-w-4xl">
                 <h3 className="text-xl font-bold text-white mb-1">Security</h3>
                 <div className="space-y-4">
                    <input type="password" placeholder="New Password" value={passwordData.new} onChange={(e)=>setPasswordData({...passwordData, new: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"/>
                    <input type="password" placeholder="Confirm Password" value={passwordData.confirm} onChange={(e)=>setPasswordData({...passwordData, confirm: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"/>
                 </div>
               </div>
            )}
          </motion.div>
        </AnimatePresence>

        {(activeTab === 'profile' || activeTab === 'security') && (
            <div className="absolute bottom-8 right-8">
            <button onClick={activeTab === 'security' ? handleSavePassword : handleSaveProfile} disabled={loading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
                {loading ? "Saving..." : <><Save size={18} /> Save Changes</>}
            </button>
            </div>
        )}
      </div>
    </div>
  );
}