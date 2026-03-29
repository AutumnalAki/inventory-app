"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Package, ClipboardList, FileText, Users, Settings, 
  LogOut, ChevronLeft, ChevronRight, Menu, X, Sparkles, Lightbulb, ChevronDown, CheckCircle, Activity, CalendarClock, Bell, Layers
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import DashboardBackground from "@/components/DashboardBackground";
import Onboarding, { useOnboarding } from "@/components/Onboarding";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";

// Map accent colors to Tailwind classes (for preset colors)
const accentColorMap: Record<string, { text: string; textDark: string; hover: string; bg: string }> = {
  orange: { text: "text-orange-600", textDark: "dark:text-orange-500", hover: "group-hover:text-orange-500", bg: "bg-orange-500" },
  blue: { text: "text-blue-600", textDark: "dark:text-blue-500", hover: "group-hover:text-blue-500", bg: "bg-blue-500" },
  purple: { text: "text-purple-600", textDark: "dark:text-purple-500", hover: "group-hover:text-purple-500", bg: "bg-purple-500" },
  emerald: { text: "text-emerald-600", textDark: "dark:text-emerald-500", hover: "group-hover:text-emerald-500", bg: "bg-emerald-500" },
  rose: { text: "text-rose-600", textDark: "dark:text-rose-500", hover: "group-hover:text-rose-500", bg: "bg-rose-500" },
  indigo: { text: "text-indigo-600", textDark: "dark:text-indigo-500", hover: "group-hover:text-indigo-500", bg: "bg-indigo-500" },
};

// Check if a string is a hex color
const isHexColor = (color: string) => /^#([0-9A-F]{3}){1,2}$/i.test(color);

function SidebarContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    useEffect(() => {
      // Prevent dashboard access if not signed in — check Supabase session instead of localStorage
      const checkSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            router.push('/');
          }
        } catch (err) {
          console.error('Session check failed', err);
          router.push('/');
        }
      };
      checkSession();
    }, []);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { role, setRole, previewRole, setPreviewRole } = useRole();
  const { accent } = useTheme();
  
  // Determine if using custom hex or preset color
  const isCustomHex = isHexColor(accent);
  const accentColors = !isCustomHex ? (accentColorMap[accent] || accentColorMap.orange) : null;
  const customColorStyle = isCustomHex ? { color: accent } : undefined;
  const customBgStyle = isCustomHex ? { backgroundColor: accent } : undefined;

  // Track if there are new updates since last visit
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  // Notifications modal state and list
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  // App version fetched from DB (key: 'app_version' in `app_settings` table)
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // --- Tester Role Selector ---
  // Only show for Tester
  const isTester = role === "Tester";
  // Use previewRole for UI if set (for Testers)
  const effectiveRole = isTester && previewRole ? previewRole : role;
  // Roles Tester can switch to (all except Developer)
  const testerSwitchableRoles = [
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
  const [testerRoleDropdown, setTesterRoleDropdown] = useState(false);
  const handleTesterRoleSwitch = (newRole: string) => {
    if (newRole === effectiveRole) return;
    setPreviewRole(newRole);
    setTesterRoleDropdown(false);
  };
  
  useEffect(() => {
    // If we're on the updates page, no animation needed
    if (pathname === '/dashboard/updates') {
      setHasNewUpdates(false);
      return;
    }
    
    // Check for new updates
    const checkForNewUpdates = async () => {
      try {
        const lastSeenTimestamp = localStorage.getItem("labTrack_lastSeenUpdate");
        
        // Get the latest update from database
        const { data, error } = await supabase
          .from('update_logs')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error || !data) {
          setHasNewUpdates(false);
          return;
        }
        
        // If never visited or there's a newer update
        if (!lastSeenTimestamp || new Date(data.created_at) > new Date(lastSeenTimestamp)) {
          setHasNewUpdates(true);
        } else {
          setHasNewUpdates(false);
        }
      } catch (err) {
        console.error('Error checking for updates:', err);
        setHasNewUpdates(false);
      }
    };
    
    checkForNewUpdates();
    
    // Subscribe to new updates in real-time
    const channel = supabase
      .channel('layout_update_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'update_logs' },
        () => {
          // New update added, show animation (only if not on updates page)
          if (pathname !== '/dashboard/updates') {
            setHasNewUpdates(true);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  // Fetch notification entries (update_logs) when opening notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('update_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) setNotifications(data as any[]);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Real-time notifications subscription: prepend new update_logs entries
  useEffect(() => {
    const channel = supabase
      .channel('notifications_update_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'update_logs' },
        (payload) => {
          try {
            const newRow = payload.new as any;
            setNotifications((prev) => {
              const next = [newRow, ...(prev || [])];
              return next.slice(0, 50);
            });
            // If not on the updates page, mark as new
            if (pathname !== '/dashboard/updates') setHasNewUpdates(true);
          } catch (err) {
            console.debug('Realtime notification handler error', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  const openNotifications = async () => {
    setShowNotifications(true);
    await fetchNotifications();
    // mark as seen
    try { localStorage.setItem('labTrack_lastSeenUpdate', new Date().toISOString()); setHasNewUpdates(false); } catch (e) { }
  };

  // Fetch app version from `app_settings` table if available
  useEffect(() => {
    let mounted = true;
    const fetchVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'app_version')
          .single();

        if (!mounted) return;
        if (error) {
          // table might not exist yet or no value set; ignore silently
          return;
        }

        if (data && typeof data.value === 'string') {
          setAppVersion(data.value);
        }
      } catch (err) {
        // ignore errors (settings table may be absent)
        console.debug('Could not fetch app version', err);
      }
    };

    fetchVersion();
    // Subscribe to realtime changes on app_settings so the UI updates immediately
    const channel = supabase
      .channel('layout_app_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newRow = payload.new as any;
              if (newRow?.key === 'app_version') {
                setAppVersion(newRow.value);
              }
            } else if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as any;
              if (oldRow?.key === 'app_version') {
                setAppVersion(null);
              }
            }
          } catch (e) {
            console.debug('Error handling app_settings realtime payload', e);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Use previewRole for sidebar and permissions if Tester is previewing
  const normalizedRole = effectiveRole ? effectiveRole.toLowerCase() : "student";
  const canViewMembers = ["developer", "superadmin", "administrator", "program chair"].includes(normalizedRole);
  const canViewSuggestions = ["developer", "superadmin", "administrator", "program chair", "faculty"].includes(normalizedRole);


  // Faculty and up can view Activity Log
  const canViewActivityLog = ["developer", "superadmin", "administrator", "program chair", "faculty"].includes(normalizedRole);

  // Faculty + Lab roles can view Reservations
  const canViewReservations = ["developer", "superadmin", "administrator", "program chair", "faculty", "me lab", "ce lab", "ece lab", "cpe lab", "chem lab", "phys lab", "ee lab"].includes(normalizedRole);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
    { icon: ClipboardList, label: "Tracking", href: "/dashboard/tracking" },
    ...(canViewReservations ? [{ icon: CalendarClock, label: "Reservations", href: "/dashboard/reservation" }] : []),
    { icon: Layers, label: "Requisition Form (Testing)", href: "/dashboard/requisition-form-testing", isTesting: true },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
    ...(canViewMembers ? [{ icon: Users, label: "Members", href: "/dashboard/members" }] : []),
    ...(canViewSuggestions ? [{ icon: Lightbulb, label: "Suggestions", href: "/dashboard/suggestions" }] : []),
    ...(canViewActivityLog ? [{ icon: Activity, label: "Activity Log", href: "/dashboard/activity-log" }] : []),
    // Developer-only Chatbot removed
    { icon: Sparkles, label: "Update Logs", href: "/dashboard/updates", isNew: hasNewUpdates },
    ...(normalizedRole === 'developer' ? [{ icon: Bell, label: "Push Notifications", href: "/dashboard/push-notifications" }] : []),
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  // Mobile bottom nav items (limited for space)
  const mobileNavItems = [
    { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
    { icon: ClipboardList, label: "Tracking", href: "/dashboard/tracking" },
    ...(canViewReservations ? [{ icon: CalendarClock, label: "Reservations", href: "/dashboard/reservation" }] : []),
    // Developer-only Chatbot removed
    { icon: Sparkles, label: "Updates", href: "/dashboard/updates", isNew: hasNewUpdates },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    setRole("Student"); 
    localStorage.removeItem("labTrack_role");
    localStorage.removeItem("labTrack_userid");
    router.push("/signin");
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-200">
      
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="hidden md:flex relative z-20 h-full border-r border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur-xl flex-col shrink-0 transition-colors duration-200"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="bg-white/5 border border-white/10 p-2 rounded-xl min-w-[40px] flex items-center justify-center shadow-lg">
            <Image src="/favicon.ico" alt="Logo" width={24} height={24} className="rounded-sm" />
          </div>
          {!isCollapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg tracking-tight">
              CDM <span 
                className={!isCustomHex ? `${accentColors?.text} ${accentColors?.textDark}` : undefined}
                style={customColorStyle}
              >LabTrack</span>
              {appVersion && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">v{appVersion}</span>
              )}
            </motion.span>
          )}
        </div>

        {/* Tester Role Selector */}
        {isTester && !isCollapsed && (
          <div className="mb-4 px-2">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preview As</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTesterRoleDropdown((v) => !v)}
                className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white text-sm hover:border-white/20 transition-colors"
              >
                <span>{effectiveRole}</span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${testerRoleDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {testerRoleDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[99999] overflow-visible max-h-96 overflow-y-auto no-scrollbar min-w-[220px] p-2"
                  >
                    {testerSwitchableRoles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleTesterRoleSwitch(r)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                          effectiveRole === r
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {r}
                        {effectiveRole === r && <CheckCircle size={14} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const isNewItem = 'isNew' in item && item.isNew;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all group relative overflow-hidden whitespace-nowrap ${
                  isActive 
                    ? "bg-gray-200 dark:bg-white/10 text-black dark:text-white font-semibold" 
                    : isNewItem
                    ? ""
                    : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-gray-200 dark:bg-white/10 rounded-xl" />
                )}
                <item.icon 
                  size={22} 
                  className={isNewItem && !isActive
                    ? `${!isCustomHex ? `${accentColors?.text} ${accentColors?.textDark}` : ""} animate-pulse`
                    : (!isCustomHex 
                      ? (isActive ? `${accentColors?.text} ${accentColors?.textDark}` : `${accentColors?.hover} transition-colors`)
                      : "transition-colors")
                  }
                  style={(isCustomHex && (isActive || isNewItem)) ? customColorStyle : undefined}
                />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className={`font-medium relative z-10 ${isNewItem && !isActive 
                      ? `${!isCustomHex ? `${accentColors?.text} ${accentColors?.textDark}` : ""} animate-pulse` 
                      : ""}`}
                    style={(isCustomHex && isNewItem && !isActive) ? customColorStyle : undefined}
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3 relative">
          <button onClick={() => { if (showNotifications) setShowNotifications(false); else openNotifications(); }} title="Notifications" className="relative p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
            <Bell size={18} />
            {hasNewUpdates && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">•</span>}
          </button>
          <div className="flex-1">
            <button 
              onClick={handleSignOut} 
              className="flex items-center gap-3 w-full px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <LogOut size={20} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>

          {/* notifications popover (small, anchored to bell) */}
          {showNotifications && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute left-4 bottom-16 w-80 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold">Notifications</h4>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {loadingNotifications ? (
                  <div className="text-gray-400">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-gray-500">No notifications.</div>
                ) : (
                  notifications.map((n: any) => (
                    <div key={n.id} className="p-2 rounded-md bg-white/5 border border-white/5">
                      <div className="text-[11px] text-gray-400">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                      <div className="text-sm text-white">{n.title || n.message || JSON.stringify(n)}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-white rounded-full p-1 hover:bg-orange-50 dark:hover:bg-orange-600 hover:border-orange-500 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Logo" width={28} height={28} className="rounded-sm" />
            <span className="font-bold text-lg">
              CDM <span 
                className={!isCustomHex ? `${accentColors?.text} ${accentColors?.textDark}` : undefined}
                style={customColorStyle}
              >LabTrack</span>
              {appVersion && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">v{appVersion}</span>
              )}
            </span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Slide-out Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white dark:bg-[#0a0a0a] border-l border-gray-200 dark:border-white/10 flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <span className="font-bold">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isNewItem = 'isNew' in item && item.isNew;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive 
                          ? "bg-gray-200 dark:bg-white/10 text-black dark:text-white font-semibold" 
                          : isNewItem
                          ? ""
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <item.icon 
                        size={20} 
                        className={isNewItem && !isActive 
                          ? `${!isCustomHex ? accentColors?.text : ""} animate-pulse`
                          : (isActive ? (!isCustomHex ? `${accentColors?.text}` : "") : "")
                        }
                        style={isCustomHex && (isActive || isNewItem) ? customColorStyle : undefined}
                      />
                      <span 
                        className={isNewItem && !isActive 
                          ? `${!isCustomHex ? accentColors?.text : ""} animate-pulse` 
                          : ""
                        }
                        style={isCustomHex && isNewItem && !isActive ? customColorStyle : undefined}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-gray-200 dark:border-white/10">
                <button 
                  onClick={handleSignOut} 
                  className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative flex flex-col pt-14 md:pt-0 pb-20 md:pb-0">
        <DashboardBackground />
        <div className="relative z-10 w-full flex-1 p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex items-center justify-around px-2 safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const isNewItem = 'isNew' in item && item.isNew;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5"
            >
              <div 
                className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? (!isCustomHex ? accentColors?.bg : "") + " text-white" 
                    : isNewItem 
                    ? "animate-pulse" 
                    : ""
                }`}
                style={isCustomHex && (isActive || isNewItem) ? (isActive ? customBgStyle : { backgroundColor: `${accent}30` }) : undefined}
              >
                <item.icon 
                  size={20} 
                  className={
                    isActive 
                      ? "" 
                      : isNewItem 
                      ? (!isCustomHex ? accentColors?.text : "") 
                      : "text-gray-500"
                  } 
                  style={isCustomHex && isNewItem && !isActive ? customColorStyle : undefined}
                />
              </div>
              <span 
                className={`text-[10px] font-medium ${
                  isActive 
                    ? (!isCustomHex ? `${accentColors?.text}` : "") 
                    : isNewItem
                    ? `${!isCustomHex ? accentColors?.text : ""} animate-pulse`
                    : "text-gray-500"
                }`}
                style={isCustomHex && (isActive || isNewItem) ? customColorStyle : undefined}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { showOnboarding, isLoaded, completeOnboarding } = useOnboarding();
  const { role, previewRole } = useRole();
  // isTester logic must be duplicated here for context
  const isTester = role === "Tester";
  const normalizedRole = (isTester && previewRole ? previewRole : role) ? (isTester && previewRole ? previewRole : role).toLowerCase() : "student";
  const canViewMembers = ["developer", "administrator", "program chair"].includes(normalizedRole);

  return (
    <>
      <SidebarContent>{children}</SidebarContent>
      {isLoaded && <Onboarding isOpen={showOnboarding} onComplete={completeOnboarding} canViewMembers={canViewMembers} />}
    </>
  );
}