"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Lock, Palette, Save, Check, Loader2, Mail, Shield, HelpCircle, RotateCcw,
  ChevronRight, Sparkles, KeyRound, Info, Lightbulb, BookOpen, Zap, Bell, QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { usePopup } from "@/context/PopupContext";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "profile", label: "Profile", icon: User, description: "Your personal information" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Customize your workspace" },
  { id: "security", label: "Security", icon: Lock, description: "Password & protection" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Notification preferences" },
  { id: "help", label: "Help", icon: HelpCircle, description: "Tutorials & support" },
];

const PRESET_THEMES = [
  { id: "orange", label: "Sunset", color: "#f97316", gradient: "from-orange-500 to-amber-500" },
  { id: "blue", label: "Ocean", color: "#3b82f6", gradient: "from-blue-500 to-cyan-500" },
  { id: "purple", label: "Neon", color: "#a855f7", gradient: "from-purple-500 to-pink-500" },
  { id: "emerald", label: "Forest", color: "#10b981", gradient: "from-emerald-500 to-teal-500" },
  { id: "rose", label: "Crimson", color: "#f43f5e", gradient: "from-rose-500 to-red-500" },
  { id: "indigo", label: "Indigo", color: "#6366f1", gradient: "from-indigo-500 to-violet-500" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const { accent, setAccent } = useTheme();
  const { showAlert } = usePopup();
  const router = useRouter();

  const handleReplayTutorial = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', session.user.id);
      }
      router.push("/dashboard");
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error("Error resetting tutorial:", error);
      showAlert({ title: "Error", message: "Failed to reset tutorial.", variant: "error" });
    }
  };

  const [userId, setUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({ firstName: "", lastName: "", email: "", role: "" });
  const [passwordData, setPasswordData] = useState({ new: "", confirm: "" });
  // Notification settings state (per-user stored in app_settings)
  const [notifSettings, setNotifSettings] = useState({ inApp: true, email: false, sound: true, digest: 'immediate' as 'immediate'|'daily'|'weekly'|'off' });
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setInitialLoading(false);
          return;
        }
        setUserId(user.id);

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          const fullUsername = data.username || "";
          const nameParts = fullUsername.split(" ");
          setProfileData({
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: data.email || user.email || "",
            role: data.role || ""
          });
          // try fetching notification settings from app_settings for this user
          try {
            const key = `notifications_user_${user.id}`;
            const { data: appRow, error: appErr } = await supabase.from('app_settings').select('value').eq('key', key).single();
            if (!appErr && appRow && appRow.value) {
              const parsed = typeof appRow.value === 'string' ? JSON.parse(appRow.value) : appRow.value;
              setNotifSettings((prev) => ({ ...prev, ...(parsed || {}) }));
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const isCustomColor = !PRESET_THEMES.some(t => t.id === accent);

  const handleSaveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
      const { error } = await supabase
        .from('users')
        .update({ username: fullName, email: profileData.email })
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
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;
      showAlert({ title: "Success", message: "Password updated successfully!", variant: "success" });
      setPasswordData({ new: "", confirm: "" });
    } catch (err: unknown) {
      console.error("Error updating password:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update password";
      showAlert({ title: "Error", message: errorMessage, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-full flex justify-center items-center">
        <Loader2 className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:w-72 shrink-0">
        <div className="lg:sticky lg:top-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your account preferences</p>
          </div>

          {/* Navigation Tabs */}
          <nav className="bg-white/5 border border-white/10 rounded-2xl p-2 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group ${
                    isActive
                      ? "bg-white text-black"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? "bg-black/10" : "bg-white/5 group-hover:bg-white/10"}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm block">{tab.label}</span>
                    <span className={`text-xs truncate block ${isActive ? "text-black/60" : "text-gray-500"}`}>
                      {tab.description}
                    </span>
                  </div>
                  <ChevronRight size={16} className={`shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />
                </button>
              );
            })}
          </nav>

          {/* Account Badge */}
          <div className="mt-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {profileData.firstName.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {profileData.firstName} {profileData.lastName}
                </p>
                <p className="text-indigo-300 text-xs truncate">{profileData.role || "User"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-500/20">
                      {profileData.firstName.charAt(0) || "U"}{profileData.lastName.charAt(0) || ""}
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <h2 className="text-2xl font-bold text-white">
                        {profileData.firstName} {profileData.lastName || "User"}
                      </h2>
                      <p className="text-gray-400 flex items-center justify-center sm:justify-start gap-2 mt-1">
                        <Mail size={14} />
                        <span className="truncate">{profileData.email}</span>
                      </p>
                      <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-gray-300">
                        <Shield size={12} /> {profileData.role || "Member"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <User size={20} className="text-indigo-400" />
                    Personal Information
                  </h3>
                  
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">First Name</label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Name</label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {loading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl text-white">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Notification Settings</h2>
                      <p className="text-gray-400 text-sm">Control how you receive notifications</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Preferences</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-300">In-app notifications</span>
                      <input type="checkbox" checked={notifSettings.inApp} onChange={(e) => setNotifSettings(s => ({ ...s, inApp: e.target.checked }))} />
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-300">Email notifications</span>
                      <input type="checkbox" checked={notifSettings.email} onChange={(e) => setNotifSettings(s => ({ ...s, email: e.target.checked }))} />
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-300">Play sound for in-app alerts</span>
                      <input type="checkbox" checked={notifSettings.sound} onChange={(e) => setNotifSettings(s => ({ ...s, sound: e.target.checked }))} />
                    </label>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Digest frequency</label>
                      <select value={notifSettings.digest} onChange={(e) => setNotifSettings(s => ({ ...s, digest: e.target.value as any }))} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white">
                        <option value="immediate">Immediately</option>
                        <option value="daily">Daily summary</option>
                        <option value="weekly">Weekly summary</option>
                        <option value="off">Off</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <button onClick={async () => {
                        if (!userId) return;
                        setSavingNotif(true);
                        try {
                          const key = `notifications_user_${userId}`;
                          const { error } = await supabase.from('app_settings').upsert({ key, value: JSON.stringify(notifSettings) }, { onConflict: 'key' });
                          if (error) throw error;
                          showAlert({ title: 'Saved', message: 'Notification preferences saved.', variant: 'success' });
                        } catch (err) {
                          console.error('Failed to save notification settings', err);
                          showAlert({ title: 'Error', message: 'Failed to save notification preferences.', variant: 'error' });
                        } finally {
                          setSavingNotif(false);
                        }
                      }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl inline-flex items-center gap-2">
                        <Save size={16} /> {savingNotif ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/20">
                      <Sparkles size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Appearance</h2>
                      <p className="text-gray-400 text-sm">Personalize your workspace with accent colors</p>
                    </div>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Accent Color</h3>
                  
                  {/* Preset Colors */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                    {PRESET_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setAccent(theme.id)}
                        className={`group relative aspect-square rounded-2xl border-2 transition-all p-3 flex flex-col items-center justify-center gap-2 ${
                          accent === theme.id
                            ? "border-white bg-white/10 scale-105"
                            : "border-white/10 hover:border-white/30 hover:bg-white/5"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg group-hover:scale-110 transition-transform`}
                        />
                        <span className="text-xs font-medium text-gray-400">{theme.label}</span>
                        {accent === theme.id && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Color */}
                  <div className="border-t border-white/10 pt-6">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Custom Color</h4>
                    <div
                      className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                        isCustomColor ? "bg-white/10 border-white/40" : "bg-black/20 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 cursor-pointer hover:scale-105 transition-transform">
                        <div className="absolute inset-0" style={{ backgroundColor: isCustomColor ? accent : "#6366f1" }} />
                        <input
                          type="color"
                          value={isCustomColor ? accent : "#6366f1"}
                          onChange={(e) => setAccent(e.target.value)}
                          className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="block font-semibold text-white">Pick Any Color</span>
                        <span className="text-sm text-gray-400">Click the box to open color picker</span>
                      </div>
                      {isCustomColor && (
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Preview</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={`px-4 py-2 rounded-xl text-white font-medium text-sm bg-gradient-to-r ${
                        isCustomColor ? "" : PRESET_THEMES.find((t) => t.id === accent)?.gradient || "from-indigo-500 to-violet-500"
                      }`}
                      style={isCustomColor ? { background: `linear-gradient(to right, ${accent}, ${accent}dd)` } : undefined}
                    >
                      Primary Button
                    </button>
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        isCustomColor ? "text-white" : `text-${accent}-400 bg-${accent}-500/20`
                      }`}
                      style={isCustomColor ? { backgroundColor: `${accent}20`, color: accent } : undefined}
                    >
                      Badge Example
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                      <Shield size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Security</h2>
                      <p className="text-gray-400 text-sm">Keep your account secure</p>
                    </div>
                  </div>
                </div>

                {/* Password Change */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <KeyRound size={20} className="text-emerald-400" />
                    Change Password
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={passwordData.new}
                          onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>

                    {passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm && (
                      <p className="text-red-400 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                        Passwords do not match
                      </p>
                    )}

                    {passwordData.new && passwordData.new.length < 6 && (
                      <p className="text-amber-400 text-sm flex items-center gap-2">
                        <Info size={14} />
                        Password must be at least 6 characters
                      </p>
                    )}

                    <div className="pt-4 border-t border-white/10">
                      <button
                        onClick={handleSavePassword}
                        disabled={loading || !passwordData.new || !passwordData.confirm || passwordData.new.length < 6}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {loading ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security Tips */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Security Tips</h3>
                  <div className="space-y-3">
                    {[
                      "Use a strong, unique password",
                      "Never share your login credentials",
                      "Log out when using shared devices",
                    ].map((tip, i) => (
                      <div key={i} className="flex items-center gap-3 text-gray-400 text-sm">
                        <Check size={16} className="text-emerald-400 shrink-0" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* HELP TAB */}
            {activeTab === "help" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/20">
                      <BookOpen size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Help & Support</h2>
                      <p className="text-gray-400 text-sm">Learn how to use CDM LabTrack</p>
                    </div>
                  </div>
                </div>

                {/* Tutorial Card */}
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-xl shadow-orange-500/20">
                      <Zap size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Interactive Tutorial</h3>
                      <p className="text-gray-400 text-sm mt-1 mb-4">
                        New to CDM LabTrack? Take a quick guided tour to learn about all features.
                      </p>
                      <button
                        onClick={handleReplayTutorial}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                      >
                        <RotateCcw size={16} />
                        Replay Tutorial
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client Portal QR */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-xl shadow-emerald-500/20">
                      <QrCode size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Client Portal QR</h3>
                      <p className="text-gray-400 text-sm mt-1 mb-4">
                        Open and download the QR code for the public requisition portal.
                      </p>
                      <button
                        onClick={() => router.push('/client-portal/qr')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                      >
                        <QrCode size={16} />
                        Open QR Page
                      </button>
                    </div>
                  </div>
                </div>

                {/* Incident Report QR */}
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0 shadow-xl shadow-orange-500/20">
                      <QrCode size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Incident Report QR</h3>
                      <p className="text-gray-400 text-sm mt-1 mb-4">
                        Open and download the QR code for the public student incident report form.
                      </p>
                      <button
                        onClick={() => router.push('/incident-portal/qr')}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                      >
                        <QrCode size={16} />
                        Open Incident QR
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-400" />
                    Quick Tips
                  </h3>
                  <div className="grid gap-3">
                    {[
                      { title: "Keyboard Navigation", desc: "Use arrow keys to navigate the tutorial steps", icon: "⌨️" },
                      { title: "Quick Filters", desc: "Click status badges on dashboard to filter items instantly", icon: "🔍" },
                      { title: "Batch Actions", desc: "Select multiple items in inventory for bulk operations", icon: "📦" },
                      { title: "Export Data", desc: "Generate reports in PDF, Excel, or CSV format anytime", icon: "📊" },
                      { title: "Real-time Sync", desc: "Changes sync instantly across all connected devices", icon: "🔄" },
                    ].map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4 bg-black/20 border border-white/5 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <span className="text-2xl">{tip.icon}</span>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{tip.title}</h4>
                          <p className="text-gray-500 text-xs mt-0.5">{tip.desc}</p>
                        </div>
                      </div>
                    ))}
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