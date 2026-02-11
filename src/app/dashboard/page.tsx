"use client";

import React, { useMemo } from "react";
import { 
  AlertTriangle, Package, Clock, 
  TrendingUp, Activity, ArrowRight, Wrench, Lock 
} from "lucide-react"; // Fixed Wrench import
import { motion } from "framer-motion";
import { useRouter } from "next/navigation"; // 1. Import Router
import { useInventory } from "@/context/InventoryContext";
import { useRole } from "@/context/RoleContext";

// Role to Lab Mapping - maps role names to their database location names
const ROLE_LAB_DB_MAPPING: Record<string, string> = {
  "ME Lab": "Mechanical Engineering Laboratory",
  "CE Lab": "Civil Engineering Laboratory",
  "ECE Lab": "ECE Laboratory",
  "CPE Lab": "Computer Laboratory",
  "CHEM Lab": "Chemistry Laboratory",
  "PHYS Lab": "Physics Laboratory",
  "EE Lab": "Electrical Engineering Laboratory"
};

// Roles with full access to all labs
const FULL_ACCESS_ROLES = ["Developer", "Administrator", "Program Chair", "Faculty"];

export default function Dashboard() {
  const { inventory, loans, logs } = useInventory();
  const { role } = useRole();
  const router = useRouter(); // 2. Initialize Router

  // Check if user has restricted lab access
  const isLabRestricted = !FULL_ACCESS_ROLES.includes(role) && ROLE_LAB_DB_MAPPING[role];
  const userLabDbName = isLabRestricted ? ROLE_LAB_DB_MAPPING[role] : null;

  // Filter inventory based on role
  const filteredInventory = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return inventory.filter(item => item.location === userLabDbName);
    }
    return inventory;
  }, [inventory, isLabRestricted, userLabDbName]);

  // Filter loans based on role
  const filteredLoans = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return loans.filter(loan => loan.location === userLabDbName);
    }
    return loans;
  }, [loans, isLabRestricted, userLabDbName]);

  // Filter logs based on role
  const filteredLogs = useMemo(() => {
    if (isLabRestricted && userLabDbName) {
      return logs.filter(log => log.location === userLabDbName || log.location === "");
    }
    return logs;
  }, [logs, isLabRestricted, userLabDbName]);

  // Stats (now using filtered data)
  const totalItems = filteredInventory.reduce((acc, item) => acc + item.quantity, 0);
  const totalTypes = filteredInventory.length;
  const lowStockItems = filteredInventory.filter(i => i.stock === "Low Stock" || i.stock === "Out of Stock").length;
  const activeLoans = filteredLoans.filter(l => l.status === "Borrowed").length;
  const brokenItems = filteredInventory.filter(i => i.condition === "Broken").length;

  // 3. Navigation Handlers
  const navigateTo = (path: string) => router.push(path);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Overview of your lab inventory and equipment status.</p>
        {isLabRestricted && userLabDbName && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
            <Lock size={12} />
            <span>Viewing data for {userLabDbName}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6" data-tour="stat-cards">
        
        {/* Card 1: Total -> Go to Inventory (Clear Filters) */}
        <StatCard 
          title="Total Items" 
          value={totalItems} 
          change={`${totalTypes} unique types`}
          icon={<Package size={24} />}
          trend="up"
          onClick={() => navigateTo('/dashboard/inventory')}
        />

        {/* Card 2: Low Stock -> Go to Inventory (Filter: Critical) */}
        <StatCard 
          title="Low Stock / Out" 
          value={lowStockItems} 
          change="Requires attention"
          icon={<AlertTriangle size={24} />}
          alert={lowStockItems > 0}
          trend={lowStockItems > 0 ? "down" : "neutral"}
          onClick={() => navigateTo('/dashboard/inventory?status=Critical')}
        />

        {/* Card 3: Loans -> Go to Tracking */}
        <StatCard 
          title="Active Loans" 
          value={activeLoans} 
          change="Currently borrowed"
          icon={<Clock size={24} />}
          trend="neutral"
          onClick={() => navigateTo('/dashboard/tracking')}
        />

        {/* Card 4: Broken -> Go to Inventory (Filter: Broken) */}
        <StatCard 
          title="Broken Items" 
          value={brokenItems} 
          change="Needs Repair"
          icon={<Wrench size={24} />}
          alert={brokenItems > 0}
          trend={brokenItems > 0 ? "down" : "neutral"}
          onClick={() => navigateTo('/dashboard/inventory?condition=Broken')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 backdrop-blur-sm" data-tour="activity-log">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-base md:text-xl font-semibold flex items-center gap-2 text-white">
               <Activity className="text-indigo-400" size={18} /> Recent Activity
            </h3>
          </div>
          <div className="space-y-3 md:space-y-4">
            {/* Group logs by date */}
            {(() => {
              const logsByDate: Record<string, typeof filteredLogs> = {};
              filteredLogs.slice(0, 20).forEach((log: any) => {
                let dateStr = "Unknown";
                if (log.time) {
                  const d = new Date(log.time);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                  } else {
                    dateStr = String(log.time).split(' ')[0];
                  }
                }
                if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
                logsByDate[dateStr].push(log);
              });
              const sortedDates = Object.keys(logsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
              if (filteredLogs.length === 0) return <p className="text-gray-500 italic">No recent activity.</p>;
              return sortedDates.map(date => (
                <div key={date}>
                  <div className="text-xs font-bold text-white/80 mb-1 mt-2">{date}</div>
                  {logsByDate[date].slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl bg-black/20 border border-white/5">
                      {(() => {
                        let color = 'bg-orange-500';
                        const txt = log.item?.toLowerCase() || '';
                        if (txt.includes('available')) color = 'bg-green-500';
                        else if (txt.includes('broken')) color = 'bg-red-500';
                        else if (txt.includes('repair')) color = 'bg-yellow-400';
                        else if (txt.includes('low stock')) color = 'bg-yellow-500';
                        else if (txt.includes('out of stock')) color = 'bg-gray-500';
                        return <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />;
                      })()}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs md:text-sm text-gray-200 truncate">
                          {log.action}: <span className="text-white font-bold">{
                            (() => {
                              if (log.item?.startsWith('Item:')) {
                                const [itemPart, changesPart] = log.item.split(' | Changes: ');
                                return itemPart.replace('Item: ', '') + (changesPart ? ` — ${changesPart}` : '');
                              }
                              return log.item;
                            })()
                          }</span>
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base md:text-xl font-bold text-white mb-1 md:mb-2">Quick Actions</h3>
              <p className="text-indigo-200 text-xs md:text-sm mb-4 md:mb-6">Manage your laboratory efficiently.</p>
              <div className="space-y-2 md:space-y-3">
                 <button onClick={() => navigateTo('/dashboard/inventory')} className="w-full bg-white/10 hover:bg-white/20 p-2.5 md:p-3 rounded-xl text-left text-xs md:text-sm font-bold flex items-center justify-between transition-colors text-white">
                    Add New Equipment <ArrowRight size={14} className="md:w-4 md:h-4" />
                 </button>
                 <button onClick={() => navigateTo('/dashboard/tracking')} className="w-full bg-white/10 hover:bg-white/20 p-2.5 md:p-3 rounded-xl text-left text-xs md:text-sm font-bold flex items-center justify-between transition-colors text-white">
                    Create Loan Record <ArrowRight size={14} className="md:w-4 md:h-4" />
                 </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// Updated StatCard with onClick support
function StatCard({ title, value, change, icon, alert = false, trend, onClick }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`p-3 md:p-6 rounded-2xl md:rounded-3xl border backdrop-blur-md relative overflow-hidden group cursor-pointer transition-all ${
        alert 
        ? "bg-red-900/10 border-red-500/30 hover:border-red-500/50" 
        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex justify-between items-start mb-2 md:mb-4">
        <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${alert ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-400 group-hover:text-orange-500 group-hover:bg-orange-500/10"} transition-colors`}>
          <span className="[&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-6 md:[&>svg]:h-6">{icon}</span>
        </div>
        {trend === "up" && <div className="hidden md:flex items-center text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded-full"><TrendingUp size={12} className="mr-1"/></div>}
      </div>
      <h3 className="text-2xl md:text-4xl font-bold tracking-tighter mb-0.5 md:mb-1 tabular-nums text-white">{value}</h3>
      <p className="text-xs md:text-sm text-gray-400 font-medium">{title}</p>
      <p className={`text-[10px] md:text-xs mt-1 md:mt-2 hidden sm:block ${alert ? "text-red-400" : "text-gray-500"}`}>{change}</p>
    </motion.div>
  );
}