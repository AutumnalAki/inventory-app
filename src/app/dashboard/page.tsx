"use client";

import React from "react";
import { 
  AlertTriangle, Package, Clock, 
  TrendingUp, Activity, ArrowRight, Wrench 
} from "lucide-react"; // Fixed Wrench import
import { motion } from "framer-motion";
import { useRouter } from "next/navigation"; // 1. Import Router
import { useInventory } from "@/context/InventoryContext";

export default function Dashboard() {
  const { inventory, loans, logs } = useInventory();
  const router = useRouter(); // 2. Initialize Router

  // Stats
  const totalItems = inventory.reduce((acc, item) => acc + item.quantity, 0);
  const totalTypes = inventory.length;
  const lowStockItems = inventory.filter(i => i.stock === "Low Stock" || i.stock === "Out of Stock").length;
  const activeLoans = loans.filter(l => l.status === "Borrowed").length;
  const brokenItems = inventory.filter(i => i.condition === "Broken").length;

  // 3. Navigation Handlers
  const navigateTo = (path: string) => router.push(path);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your lab inventory and equipment status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
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
                 <button onClick={() => navigateTo('/dashboard/inventory')} className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl text-left text-sm font-bold flex items-center justify-between transition-colors text-white">
                    Add New Equipment <ArrowRight size={16} />
                 </button>
                 <button onClick={() => navigateTo('/dashboard/tracking')} className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl text-left text-sm font-bold flex items-center justify-between transition-colors text-white">
                    Create Loan Record <ArrowRight size={16} />
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
      className={`p-6 rounded-3xl border backdrop-blur-md relative overflow-hidden group cursor-pointer transition-all ${
        alert 
        ? "bg-red-900/10 border-red-500/30 hover:border-red-500/50" 
        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${alert ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-400 group-hover:text-orange-500 group-hover:bg-orange-500/10"} transition-colors`}>
          {icon}
        </div>
        {trend === "up" && <div className="flex items-center text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded-full"><TrendingUp size={12} className="mr-1"/></div>}
      </div>
      <h3 className="text-4xl font-bold tracking-tighter mb-1 tabular-nums text-white">{value}</h3>
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      <p className={`text-xs mt-2 ${alert ? "text-red-400" : "text-gray-500"}`}>{change}</p>
    </motion.div>
  );
}