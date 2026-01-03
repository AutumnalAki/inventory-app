"use client";

import React from "react";
import { 
  AlertTriangle, Package, CheckCircle, Clock, 
  TrendingUp, MoreHorizontal, Activity, ArrowRight 
} from "lucide-react";
import { motion } from "framer-motion";
// 1. Import Hook
import { useInventory } from "@/context/InventoryContext";

export default function Dashboard() {
  // 2. Get Real Data
  const { inventory, loans, logs } = useInventory();

  // 3. Calculate Stats
  const totalItems = inventory.reduce((acc, item) => acc + item.quantity, 0); // Sum of all quantities
  const totalTypes = inventory.length;
  const lowStockItems = inventory.filter(i => i.stock === "Low Stock" || i.stock === "Out of Stock").length;
  const activeLoans = loans.filter(l => l.status === "Borrowed").length;
  const brokenItems = inventory.filter(i => i.condition === "Broken").length;

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your lab inventory and equipment status.</p>
      </div>

      {/* Stats Grid - Connected to Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Items" 
          value={totalItems} 
          change={`${totalTypes} unique types`}
          icon={<Package size={24} />}
          trend="up"
        />
        <StatCard 
          title="Low Stock / Out" 
          value={lowStockItems} 
          change="Requires attention"
          icon={<AlertTriangle size={24} />}
          alert={lowStockItems > 0}
          trend={lowStockItems > 0 ? "down" : "neutral"}
        />
        <StatCard 
          title="Active Loans" 
          value={activeLoans} 
          change="Currently borrowed"
          icon={<Clock size={24} />}
          trend="neutral"
        />
        <StatCard 
          title="Broken Items" 
          value={brokenItems} 
          change="Needs Repair"
          icon={<WrenchIcon size={24} />}
          alert={brokenItems > 0}
          trend={brokenItems > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity Feed - Connected to Real Logs */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
               <Activity className="text-indigo-400" size={20} /> Recent Activity
            </h3>
          </div>
          
          <div className="space-y-4">
            {logs.slice(0, 5).map((log) => (
               <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-200">
                      {log.action}: <span className="text-white font-bold">{log.item}</span>
                    </p>
                    <p className="text-xs text-gray-500">{log.time}</p>
                  </div>
               </div>
            ))}
            {logs.length === 0 && <p className="text-gray-500 italic">No recent activity.</p>}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Quick Actions</h3>
              <p className="text-indigo-200 text-sm mb-6">Manage your laboratory efficiently.</p>
              
              <div className="space-y-3">
                 <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl text-left text-sm font-bold flex items-center justify-between transition-colors">
                    Add New Equipment <ArrowRight size={16} />
                 </button>
                 <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl text-left text-sm font-bold flex items-center justify-between transition-colors">
                    Create Loan Record <ArrowRight size={16} />
                 </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ title, value, change, icon, alert = false, trend }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-6 rounded-3xl border backdrop-blur-md relative overflow-hidden group ${
        alert 
        ? "bg-red-900/10 border-red-500/30" 
        : "bg-white/5 border-white/10 hover:bg-white/10"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${alert ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-400 group-hover:text-orange-500 group-hover:bg-orange-500/10"} transition-colors`}>
          {icon}
        </div>
        {trend === "up" && <div className="flex items-center text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded-full"><TrendingUp size={12} className="mr-1"/></div>}
      </div>
      <h3 className="text-4xl font-bold tracking-tighter mb-1 tabular-nums">{value}</h3>
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      <p className={`text-xs mt-2 ${alert ? "text-red-400" : "text-gray-500"}`}>{change}</p>
    </motion.div>
  );
}

function WrenchIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}