"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Package, ClipboardList, FileText, Users, Settings, 
  LogOut, ChevronLeft, ChevronRight, Menu, X 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import DashboardBackground from "@/components/DashboardBackground";
import Onboarding, { useOnboarding } from "@/components/Onboarding";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole } = useRole();
  const { accent } = useTheme();
  
  // Determine if using custom hex or preset color
  const isCustomHex = isHexColor(accent);
  const accentColors = !isCustomHex ? (accentColorMap[accent] || accentColorMap.orange) : null;
  const customColorStyle = isCustomHex ? { color: accent } : undefined;
  const customBgStyle = isCustomHex ? { backgroundColor: accent } : undefined;

  const normalizedRole = role ? role.toLowerCase() : "student";
  const canViewMembers = ["developer", "administrator", "program chair"].includes(normalizedRole);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
    { icon: ClipboardList, label: "Tracking", href: "/dashboard/tracking" },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
    ...(canViewMembers ? [{ icon: Users, label: "Members", href: "/dashboard/members" }] : []),
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  // Mobile bottom nav items (limited for space)
  const mobileNavItems = [
    { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
    { icon: ClipboardList, label: "Tracking", href: "/dashboard/tracking" },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
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
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all group relative overflow-hidden whitespace-nowrap ${
                  isActive 
                    ? "bg-gray-200 dark:bg-white/10 text-black dark:text-white font-semibold" 
                    : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-gray-200 dark:bg-white/10 rounded-xl" />
                )}
                <item.icon 
                  size={22} 
                  className={!isCustomHex 
                    ? (isActive ? `${accentColors?.text} ${accentColors?.textDark}` : `${accentColors?.hover} transition-colors`)
                    : "transition-colors"
                  }
                  style={isCustomHex && isActive ? customColorStyle : undefined}
                />
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium relative z-10">
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button 
            onClick={handleSignOut} 
            className="flex items-center gap-3 w-full px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
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
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive 
                          ? "bg-gray-200 dark:bg-white/10 text-black dark:text-white font-semibold" 
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <item.icon 
                        size={20} 
                        className={isActive ? (!isCustomHex ? `${accentColors?.text}` : "") : ""}
                        style={isCustomHex && isActive ? customColorStyle : undefined}
                      />
                      <span>{item.label}</span>
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
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5"
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? (!isCustomHex ? accentColors?.bg : "") + " text-white" : ""}`}
                style={isCustomHex && isActive ? customBgStyle : undefined}
              >
                <item.icon size={20} className={!isActive ? "text-gray-500" : ""} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? (!isCustomHex ? `${accentColors?.text}` : "text-white") : "text-gray-500"}`}
                style={isCustomHex && isActive ? customColorStyle : undefined}
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
  const { role } = useRole();
  
  const normalizedRole = role ? role.toLowerCase() : "student";
  const canViewMembers = ["developer", "administrator", "program chair"].includes(normalizedRole);

  return (
    <>
      <SidebarContent>{children}</SidebarContent>
      {isLoaded && <Onboarding isOpen={showOnboarding} onComplete={completeOnboarding} canViewMembers={canViewMembers} />}
    </>
  );
}