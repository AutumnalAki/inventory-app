"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, Menu, X } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAboutFooter, setShowAboutFooter] = useState(false);

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#050505]">
      <DynamicBackground />

      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg">
              <Image src="/favicon.ico" alt="Logo" width={24} height={24} className="rounded-sm" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">
              CDM <span className="text-orange-600">LabTrack</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setShowAboutFooter(!showAboutFooter)} 
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              About
            </button>
            <Link href="/signin">
              <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-all">
                Sign In
              </button>
            </Link>
          </div>

          <button className="md:hidden text-gray-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-0 w-full bg-black/90 border-b border-white/10 p-6 flex flex-col gap-4 md:hidden"
            >
              <button 
                onClick={() => { setShowAboutFooter(!showAboutFooter); setIsMenuOpen(false); }}
                className="text-left text-lg font-medium"
              >
                About
              </button>
              <Link href="/signin" className="bg-white text-black text-center py-3 rounded-xl font-bold">
                Sign In
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8"
          >
            <Shield size={14} className="text-indigo-400" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Enterprise Grade Security</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-black mb-6 tracking-tighter leading-none"
          >
            SMART <span className="text-orange-600">INVENTORY</span><br />
            MANAGEMENT.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }} 
            className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
          >
            Experience the future of laboratory tracking. Real-time monitoring, 
            automated reporting, and seamless equipment loans.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-10">
            <Link href="/signup">
              <button className="group bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-2 w-full sm:w-auto">
                Sign Up <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            
            <Link href="/signin">
              <button className="group bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold transition-all w-full sm:w-auto flex items-center justify-center">
                Sign In
              </button>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* --- FOOTER --- */}
      <AnimatePresence>
        {showAboutFooter && (
          <motion.footer 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 50, opacity: 0 }} 
            className="fixed bottom-0 left-0 w-full z-40 bg-black/80 backdrop-blur-md border-t border-white/10 p-6"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="text-center md:text-left">
                <p className="text-sm font-bold text-white">CDM Inventory Management Website 2025</p>
                <p className="text-xs text-gray-400 mt-1">Developed by: <span className="text-indigo-400 font-medium">Justin L.</span></p>
              </div>
              <button 
                onClick={() => setShowAboutFooter(false)} 
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Close [x]
              </button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}