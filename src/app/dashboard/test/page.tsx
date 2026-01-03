"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function TestPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Theme Test Lab</h1>
           <p className="text-gray-500 dark:text-gray-400 mt-1">Current Active Mode: <span className="font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">{theme}</span></p>
        </div>
        
        <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-lg">
             <button onClick={() => setTheme("light")} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Light</button>
             <button onClick={() => setTheme("dark")} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${theme === 'dark' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Dark</button>
        </div>
      </div>

      {/* Demo Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Surfaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-lg">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Standard Card</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Should be white in light mode, transparent in dark mode.</p>
            </div>
            <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-300 mb-2">Accented Surface</h3>
                <p className="text-indigo-700 dark:text-indigo-400 text-sm">Colored backgrounds for emphasis.</p>
            </div>
        </div>
      </section>

      {/* Demo Alerts */}
      <section className="space-y-4">
         <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Alerts</h2>
         <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400">
            <CheckCircle size={20} />
            <span className="font-medium">Success Message</span>
         </div>
         <div className="flex items-center gap-3 p-4 rounded-xl bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-400">
            <XCircle size={20} />
            <span className="font-medium">Error Message</span>
         </div>
      </section>
    </div>
  );
}