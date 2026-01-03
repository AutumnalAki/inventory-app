//App Home Page with Animated Hero Section

"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Box } from "lucide-react";
import Link from "next/link";
import DynamicBackground from "@/components/DynamicBackground";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

export default function Home() {
  return (
    <main className="relative min-h-screen text-white selection:bg-orange-500 selection:text-white font-sans overflow-hidden">
      <DynamicBackground />

      {/* --- Navbar --- */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg shadow-lg shadow-orange-900/20">
            <Box size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">CDM LabTrack</span>
        </div>
        
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <Link href="#" className="hover:text-white transition-colors">About</Link>
          <Link href="#" className="hover:text-white transition-colors">Contact</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/signin" className="px-6 py-2.5 text-sm font-bold bg-white text-black rounded-full hover:bg-gray-200 transition-all">
            Sign In
          </Link>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="flex justify-center mb-8">
            <span className="px-4 py-1.5 text-xs font-semibold tracking-wider uppercase border border-red-500/30 bg-red-500/10 text-red-400 rounded-full">
              ● Invite Only
            </span>
          </motion.div>

          <motion.h1 
            variants={fadeInUp} 
            className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-[1.1]"
          >
            Welcome to <br />
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-red-600 bg-clip-text text-transparent">
              CDM LabTrack.
            </span>
          </motion.h1>

          <motion.p 
            variants={fadeInUp} 
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            An exclusive workspace for selected members. Join your team and collaborate on groundbreaking projects.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link 
              href="/signup" 
              className="group relative px-9 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-full font-bold text-white shadow-xl shadow-orange-900/20 hover:shadow-orange-500/40 transition-all hover:scale-105"
            >
              Sign Up
              <ArrowRight className="inline ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/signin" 
              className="px-9 py-4 rounded-full font-bold text-gray-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
            >
              Sign In
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}