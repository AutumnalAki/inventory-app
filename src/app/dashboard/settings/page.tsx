"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Lock, Bell, Palette, Save, 
  Moon, Sun, Monitor, Check, Mail, Shield, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext"; // <--- Import Theme Hook

const TABS = [
  { id: "profile", label: "Profile & Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Theme Hook
  const { theme, setTheme } = useTheme();

  // User Data State
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
  });

  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // Notification Toggles (Local state for UI demo)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);

  // 1. Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
        const userId = localStorage.getItem("labTrack_userid");
        if (!userId) {
            setInitialLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            const nameParts = data.username.split(" ");
            const first = nameParts[0];
            const last = nameParts.slice(1).join(" ");

            setProfileData({
                firstName: first || "",
                lastName: last || "",
                email: data.email,
                bio: data.role
            });
        }
        setInitialLoading(false);
    };

    fetchUserData();
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    const userId = localStorage.getItem("labTrack_userid");
    const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();

    const { error } = await supabase
        .from('users')
        .update({ username: fullName, email: profileData.email })
        .eq('id', userId);

    setLoading(false);
    if (!error) alert("Profile updated successfully!");
    else alert("Failed to update profile.");
  };

  const handleSavePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
        alert("New passwords do not match.");
        return;
    }
    
    setLoading(true);
    const userId = localStorage.getItem("labTrack_userid");
    const { error } = await supabase
        .from('users')
        .update({ password: passwordData.new })
        .eq('id', userId);

    setLoading(false);
    if (!error) {
        alert("Password updated! Please log in again.");
        setPasswordData({ current: "", new: "", confirm: "" });
    } else {
        alert("Failed to update password.");
    }
  };

  if (initialLoading) {
      return <div className="h-full flex items-center justify-center text-gray-500"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 h-full flex flex-col max-h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white dark:text-white text-gray-900">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences and workspace configuration.</p>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl flex flex-wrap gap-1 w-full shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-black shadow-lg shadow-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
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
            {/* --- PROFILE TAB --- */}
            {activeTab === "profile" && (
              <div className="space-y-8 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Personal Information</h3>
                  <p className="text-gray-400 text-sm">Update your public profile details.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl border-4 border-black/50">
                      {profileData.firstName?.[0]}{profileData.lastName?.[0]}
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                        <input 
                          type="text" 
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                        <input 
                          type="text" 
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                      <input 
                          type="email" 
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
                      <input type="text" value={profileData.bio} disabled className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed capitalize"/>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- APPEARANCE TAB (THEME SWITCHER) --- */}
            {activeTab === "appearance" && (
              <div className="space-y-8 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Theme Preferences</h3>
                  <p className="text-gray-400 text-sm">Customize how the dashboard looks on your device.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: "dark", label: "Dark Mode", icon: Moon },
                    { id: "light", label: "Light Mode", icon: Sun },
                    { id: "system", label: "System", icon: Monitor },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTheme(item.id as any)}
                      className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${
                        theme === item.id 
                          ? "bg-indigo-500/10 border-indigo-500/50 text-white" 
                          : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <item.icon size={32} />
                      <span className="font-medium">{item.label}</span>
                      {theme === item.id && (
                        <div className="absolute top-3 right-3 text-indigo-400"><Check size={16} /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* --- SECURITY TAB --- */}
            {activeTab === "security" && (
              <div className="space-y-8 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Security</h3>
                  <p className="text-gray-400 text-sm">Update your password.</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                    <input type="password" value={passwordData.new} onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                    <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>
              </div>
            )}

            {/* --- NOTIFICATIONS TAB --- */}
            {activeTab === "notifications" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Mail size={20} /></div>
                      <div><h4 className="font-bold text-white">Email Notifications</h4></div>
                    </div>
                    <button onClick={() => setEmailAlerts(!emailAlerts)} className={`w-12 h-6 rounded-full p-1 transition-colors ${emailAlerts ? 'bg-indigo-600' : 'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${emailAlerts ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                  </div>
                </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Save Button */}
        {(activeTab === 'profile' || activeTab === 'security') && (
            <div className="absolute bottom-8 right-8">
            <button 
                onClick={activeTab === 'security' ? handleSavePassword : handleSaveProfile}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? "Saving..." : <><Save size={18} /> Save Changes</>}
            </button>
            </div>
        )}
      </div>
    </div>
  );
}