"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Lock, Palette, Save, Check, Loader2, Mail, Shield, Bell, Monitor, Moon, Sun, HelpCircle, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { usePopup } from "@/context/PopupContext";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Lock },
  { id: "help", label: "Help", icon: HelpCircle },
];

const PRESET_THEMES = [
  { id: "orange", label: "Sunset Orange", color: "bg-orange-500", gradient: "from-orange-500 to-amber-500" },
  { id: "blue",   label: "Ocean Blue",    color: "bg-blue-500", gradient: "from-blue-500 to-cyan-500" },
  { id: "purple", label: "Neon Purple",   color: "bg-purple-500", gradient: "from-purple-500 to-pink-500" },
  { id: "emerald",label: "Forest Green",  color: "bg-emerald-500", gradient: "from-emerald-500 to-teal-500" },
  { id: "rose",   label: "Crimson Red",   color: "bg-rose-500", gradient: "from-rose-500 to-red-500" },
  { id: "indigo", label: "Deep Indigo",   color: "bg-indigo-500", gradient: "from-indigo-500 to-violet-500" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Theme Context
  const { accent, setAccent } = useTheme();
  
  // Popup Context
  const { showAlert } = usePopup();

  // Router for navigation
  const router = useRouter();

  // Function to reset and replay tutorial
  const handleReplayTutorial = () => {
    localStorage.removeItem("cdm-labtrack-onboarding-complete");
    router.push("/dashboard");
    // Small delay to ensure navigation completes before reload triggers onboarding
    setTimeout(() => window.location.reload(), 100);
  };

  // User Data State
  const [userId, setUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({ firstName: "", lastName: "", email: "", bio: "" });
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });

  // --- 1. Fix: Fetch Data using Supabase Auth (Not LocalStorage) ---
  useEffect(() => {
    const fetchUserData = async () => {
        try {
            // A. Get Authenticated User directly from Supabase
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Not logged in
                setInitialLoading(false); 
                return; 
            }

            setUserId(user.id);

            // B. Get Profile Data from 'users' table
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;

            if (data) {
                // Safe parsing of username to first/last
                const fullUsername = data.username || "";
                const nameParts = fullUsername.split(" ");
                
                setProfileData({
                    firstName: nameParts[0] || "",
                    lastName: nameParts.slice(1).join(" ") || "",
                    email: data.email || user.email || "", // Fallback to Auth email
                    bio: data.role || "" 
                });
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    fetchUserData();
  }, []);

  // Determine if the current accent is one of the presets or a custom hex
  const isCustomColor = !PRESET_THEMES.some(t => t.id === accent);

  // --- Handle Updates ---

  const handleSaveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
        const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
        
        const { error } = await supabase
            .from('users')
            .update({ 
                username: fullName, 
                email: profileData.email 
            })
            .eq('id', userId);

        if (error) throw error;
        showAlert({ title: "Success", message: "Profile updated successfully!", variant: "success" });

    } catch (err) {
        console.error("Error updating profile:", err);
        showAlert({ title: "Error", message: "Failed to update profile.", variant: "error" });
    } finally {
        setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!userId) return;
    if (passwordData.new !== passwordData.confirm) {
      return showAlert({ title: "Error", message: "Passwords do not match", variant: "error" });
    }
    if (passwordData.new.length < 6) {
      return showAlert({ title: "Error", message: "Password must be at least 6 characters", variant: "error" });
    }
    
    setLoading(true);
    try {
        const { error } = await supabase.auth.updateUser({ 
            password: passwordData.new 
        });

        if (error) throw error;
        showAlert({ title: "Success", message: "Password updated successfully!", variant: "success" });
        setPasswordData({ current: "", new: "", confirm: "" });

    } catch (err: any) {
        console.error("Error updating password:", err);
        showAlert({ title: "Error", message: err.message || "Failed to update password", variant: "error" });
    } finally {
        setLoading(false);
    }
  };

  if (initialLoading) {
    return (
        <div className="h-full flex justify-center items-center">
            <Loader2 className="animate-spin text-gray-500"/>
        </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col max-h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and workspace preferences.</p>
      </div>

      {/* --- TAB NAVIGATION --- */}
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

      {/* --- CONTENT AREA --- */}
      <div className="bg-white/5 border border-white/10 rounded-2xl flex-1 overflow-y-auto relative shadow-xl backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {/* 1. PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="p-6 md:p-8">
                <div className="max-w-2xl space-y-8">
                  {/* Profile Header */}
                  <div className="flex items-center gap-6 pb-6 border-b border-white/10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-lg">
                      {profileData.firstName.charAt(0) || "U"}{profileData.lastName.charAt(0) || ""}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{profileData.firstName} {profileData.lastName || "User"}</h3>
                      <p className="text-gray-400 flex items-center gap-2 mt-1"><Mail size={14} /> {profileData.email}</p>
                    </div>
                  </div>

                  {/* Form Section */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={16} className="text-indigo-400" /> Personal Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase">First Name</label>
                          <input 
                            type="text" 
                            value={profileData.firstName} 
                            onChange={(e) => setProfileData({...profileData, firstName: e.target.value})} 
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase">Last Name</label>
                          <input 
                            type="text" 
                            value={profileData.lastName} 
                            onChange={(e) => setProfileData({...profileData, lastName: e.target.value})} 
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                          type="email" 
                          value={profileData.email} 
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                          className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-6 border-t border-white/10">
                    <button 
                      onClick={handleSaveProfile} 
                      disabled={loading} 
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="p-6 md:p-8">
                <div className="max-w-3xl space-y-8">
                  <div className="pb-6 border-b border-white/10">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Palette size={20} />
                      </div>
                      Workspace Theme
                    </h3>
                    <p className="text-gray-400 mt-2">Personalize your dashboard with your favorite accent color.</p>
                  </div>

                  {/* Theme Grid */}
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Preset Colors</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {PRESET_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setAccent(theme.id)}
                          className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                            accent === theme.id 
                              ? "bg-white/10 border-white/40 shadow-xl scale-[1.02]" 
                              : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg group-hover:scale-110 transition-transform`} />
                          <div className="text-left flex-1">
                            <span className="block font-bold text-white text-sm">{theme.label}</span>
                          </div>
                          {accent === theme.id && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                              <Check size={14} className="text-black" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Color */}
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Custom Color</h4>
                    <div className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isCustomColor ? "bg-white/10 border-white/40" : "bg-black/20 border-white/5 hover:bg-white/5"}`}>
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 cursor-pointer hover:scale-105 transition-transform">
                        <div className="absolute inset-0" style={{ backgroundColor: isCustomColor ? accent : '#6366f1' }} />
                        <input 
                          type="color" 
                          value={isCustomColor ? accent : "#6366f1"}
                          onChange={(e) => setAccent(e.target.value)}
                          className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
                        />
                      </div>
                      <div className="text-left flex-1">
                        <span className="block font-bold text-white">Pick Any Color</span>
                        <span className="text-sm text-gray-400">Click the color box to customize</span>
                      </div>
                      {isCustomColor && (
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SECURITY TAB */}
            {activeTab === "security" && (
              <div className="p-6 md:p-8">
                <div className="max-w-2xl space-y-8">
                  <div className="pb-6 border-b border-white/10">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Shield size={20} />
                      </div>
                      Security Settings
                    </h3>
                    <p className="text-gray-400 mt-2">Keep your account secure by updating your password regularly.</p>
                  </div>

                  {/* Password Section */}
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Lock size={16} className="text-emerald-400" /> Change Password
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="password" 
                            placeholder="Enter new password" 
                            value={passwordData.new} 
                            onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} 
                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Confirm New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="password" 
                            placeholder="Confirm new password" 
                            value={passwordData.confirm} 
                            onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} 
                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        </div>
                      </div>
                      {passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm && (
                        <p className="text-red-400 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-6 border-t border-white/10">
                    <button 
                      onClick={handleSavePassword} 
                      disabled={loading || !passwordData.new || !passwordData.confirm} 
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {loading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. HELP TAB */}
            {activeTab === "help" && (
              <div className="p-6 md:p-8">
                <div className="max-w-2xl space-y-8">
                  <div className="pb-6 border-b border-white/10">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <HelpCircle size={20} />
                      </div>
                      Help & Support
                    </h3>
                    <p className="text-gray-400 mt-2">Get help with using CDM LabTrack.</p>
                  </div>

                  {/* Tutorial Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <RotateCcw size={16} className="text-blue-400" /> Getting Started
                    </h4>
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                          <HelpCircle size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-bold text-white text-lg">Interactive Tutorial</h5>
                          <p className="text-gray-400 text-sm mt-1 mb-4">
                            New to CDM LabTrack? Take a quick tour to learn about all the features and how to use them effectively.
                          </p>
                          <button 
                            onClick={handleReplayTutorial}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                          >
                            <RotateCcw size={16} />
                            Replay Tutorial
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Tips */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quick Tips</h4>
                    <div className="grid gap-3">
                      {[
                        { title: "Keyboard Shortcuts", desc: "Use arrow keys to navigate the tutorial" },
                        { title: "Filter Inventory", desc: "Click on status badges in the dashboard to filter items" },
                        { title: "Batch Actions", desc: "Select multiple items in inventory to delete or update them at once" },
                        { title: "Export Data", desc: "Generate reports in PDF, Excel, or CSV format" },
                      ].map((tip, i) => (
                        <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-sm">{tip.title}</h5>
                            <p className="text-gray-500 text-xs mt-0.5">{tip.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}