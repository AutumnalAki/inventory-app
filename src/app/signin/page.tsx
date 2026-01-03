"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Box, ArrowLeft, Bug } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";

export default function SignIn() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 font-sans text-white">
      <DynamicBackground />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="bg-orange-600 p-3 rounded-xl mb-4 shadow-lg shadow-orange-900/20">
              <Box size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-sm mt-2">Sign in to CDM LabTrack</p>
          </div>

          <form className="space-y-5">
            {/* Inputs (Visual Only for now) */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" placeholder="you@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"/>
            </div>

            <button type="button" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg shadow-orange-900/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all">
              Sign In
            </button>

            {/* DEBUG BUTTON */}
            <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-white/5 transition-all text-sm">
               <Bug size={16} />
               Debug: Enter Dashboard
            </Link>
          </form>

          <div className="mt-8 text-center space-y-4">
             <Link href="/" className="inline-flex items-center text-xs text-gray-600 hover:text-white transition-colors">
              <ArrowLeft size={12} className="mr-1" />
              Back to home
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}