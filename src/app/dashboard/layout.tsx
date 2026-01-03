"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ClipboardList, FileText, Users, Settings, 
  LogOut, ChevronLeft, ChevronRight, ShieldAlert 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import DashboardBackground from "@/components/DashboardBackground";
import { useRole } from "@/context/RoleContext";

function SidebarContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole } = useRole();

  const normalizedRole = role ? role.toLowerCase() : "student";
  const canViewMembers = ["administrator", "program chair"].includes(normalizedRole);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
    { icon: ClipboardList, label: "Item Tracking", href: "/dashboard/tracking" },
    { icon: FileText, label: "Reports", href: "/dashboard/reports" },
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
    // FIX: Using 'bg-background' allows the theme variable to control the color
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-200">
      
      {/* Sidebar - Updated colors for Light/Dark modes */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="relative z-20 h-full border-r border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur-xl flex flex-col shrink-0 transition-colors duration-200"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="bg-white/5 border border-white/10 p-2 rounded-xl min-w-[40px] flex items-center justify-center shadow-lg">
            <Image src="/favicon.ico" alt="Logo" width={24} height={24} className="rounded-sm" />
          </div>
          {!isCollapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg tracking-tight">
              CDM <span className="text-orange-600">LabTrack</span>
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
                <item.icon size={22} className={isActive ? "text-orange-600 dark:text-orange-500" : "group-hover:text-orange-500 transition-colors"} />
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

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* The background component handles its own dark/light logic */}
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