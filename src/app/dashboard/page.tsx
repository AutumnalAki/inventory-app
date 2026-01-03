"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, Package, CheckCircle, Clock, 
  TrendingUp, MoreHorizontal 
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your lab inventory and equipment status.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Items" 
          value="1,248" 
          change="+12% this month"
          icon={<Package size={24} />}
          trend="up"
        />
        <StatCard 
          title="Low Stock" 
          value="14" 
          change="Requires attention"
          icon={<AlertTriangle size={24} />}
          alert={true}
          trend="neutral"
        />
        <StatCard 
          title="Active Loans" 
          value="08" 
          change="3 due today"
          icon={<Clock size={24} />}
          trend="neutral"
        />
        <StatCard 
          title="In Repair" 
          value="03" 
          change="Est. fix: 2 days"
          icon={<WrenchIcon size={24} />}
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section (Custom Animated Bar Chart) */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-semibold">Inventory Distribution</h3>
            <button className="text-sm text-gray-400 hover:text-white">View Report</button>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            <ChartBar label="Sensors" height="80%" color="bg-orange-500" />
            <ChartBar label="Motors" height="45%" color="bg-gray-600" />
            <ChartBar label="Micro" height="65%" color="bg-gray-600" />
            <ChartBar label="Tools" height="30%" color="bg-gray-600" />
            <ChartBar label="Cables" height="90%" color="bg-gray-600" />
            <ChartBar label="Optics" height="55%" color="bg-gray-600" />
            <ChartBar label="Audio" height="25%" color="bg-gray-600" />
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Recent Activity</h3>
            <MoreHorizontal size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-6">
            <ActivityItem 
              user="John Doe" 
              action="borrowed" 
              item="V5 Robot Brain" 
              time="2 hrs ago"
            />
            <ActivityItem 
              user="Sarah Lee" 
              action="returned" 
              item="Optical Sensor" 
              time="4 hrs ago"
            />
            <ActivityItem 
              user="Admin" 
              action="restocked" 
              item="Smart Cables" 
              time="1 day ago"
            />
            <ActivityItem 
              user="Mike Chen" 
              action="flagged" 
              item="Motor 393 (Broken)" 
              time="1 day ago"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components for Dashboard ---

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
        {trend === "up" && <div className="flex items-center text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full"><TrendingUp size={12} className="mr-1"/> +4%</div>}
      </div>
      <h3 className="text-4xl font-bold tracking-tighter mb-1">{value}</h3>
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      <p className={`text-xs mt-2 ${alert ? "text-red-400" : "text-gray-500"}`}>{change}</p>
    </motion.div>
  );
}

function ChartBar({ label, height, color }: any) {
  return (
    <div className="flex flex-col items-center gap-2 w-full group cursor-pointer">
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: height }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className={`w-full rounded-t-lg ${color} opacity-80 group-hover:opacity-100 transition-opacity relative`}
      >
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {height}
        </div>
      </motion.div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

function ActivityItem({ user, action, item, time }: any) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-2 h-2 mt-2 rounded-full bg-orange-500 shrink-0" />
      <div>
        <p className="text-sm text-gray-200">
          <span className="font-bold text-white">{user}</span> {action} <span className="text-orange-400">{item}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

// Simple wrapper for the Wrench icon since I used it in StatCard but didn't import 'WrenchIcon' specifically
function WrenchIcon({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}