"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ClipboardList, FileText, Users, Settings, 
  LogOut, ChevronLeft, ChevronRight, Box, ShieldAlert 
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import DashboardBackground from "@/components/DashboardBackground";
import { useRole } from "@/context/RoleContext";

function SidebarContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole } = useRole();

  // --- FIX: Case-Insensitive Check ---
  // This ensures 'administrator' (from DB) matches 'Administrator' (from App)
  const normalizedRole = role ? role.toLowerCase() : "student";
  const canViewMembers = ["administrator", "program chair"].includes(normalizedRole);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
    { icon: ClipboardList, label: "Item Tracking", href: "/dashboard/tracking" },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
    // Only show Members if permission check passes
    ...(canViewMembers ? [{ icon: Users, label: "Members", href: "/dashboard/members" }] : []),
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  const handleSignOut = () => {
    setRole("Student"); 
    localStorage.removeItem("labTrack_role");
    localStorage.removeItem("labTrack_userid");
    router.push("/signin");
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden selection:bg-orange-500 selection:text-white">
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="relative z-20 h-full border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col shrink-0"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="bg-orange-600 p-2 rounded-lg min-w-[36px]">
            <Box size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg tracking-tight">
              CDM LabTrack
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
                    ? "bg-white/10 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-xl" />
                )}
                <item.icon size={22} className={isActive ? "text-orange-500" : "group-hover:text-orange-400"} />
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium">
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Debug Role Switcher */}
        {!isCollapsed && (
          <div className="mx-4 mb-4 p-3 bg-red-900/10 border border-red-500/20 rounded-xl">
             <div className="flex items-center gap-2 mb-2 text-red-400">
                <ShieldAlert size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Debug Role</span>
             </div>
             {/* Note: This allows manual overriding for testing */}
             <select 
               value={role} 
               onChange={(e: any) => setRole(e.target.value)}
               className="w-full bg-black/40 text-xs text-white border border-white/10 rounded-lg p-2 focus:outline-none focus:border-red-500 cursor-pointer"
             >
               <option value="Administrator">Administrator</option>
               <option value="Program Chair">Program Chair</option>
               <option value="Faculty">Faculty</option>
               <option value="Student">Student</option>
             </select>
             <div className="mt-1 text-[10px] text-gray-500">
               Current: <span className="text-gray-300 font-mono">{role}</span>
             </div>
          </div>
        )}

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleSignOut} 
            className="flex items-center gap-3 w-full px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-gray-800 border border-gray-600 text-white rounded-full p-1 hover:bg-orange-600 hover:border-orange-500 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        <DashboardBackground />
        <div className="relative z-10 w-full flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarContent>{children}</SidebarContent>
  );
}