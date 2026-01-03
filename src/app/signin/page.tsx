"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation"; // 1. For redirection
import { Box, ArrowLeft, Bug, Loader2, AlertCircle } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";
import { supabase } from "@/lib/supabase"; // 2. Connect to DB
import { useRole } from "@/context/RoleContext"; // 3. To update App Role

export default function SignIn() {
  const router = useRouter();
  const { setRole } = useRole();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Check if user exists in the 'users' table
      const { data: user, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (dbError || !user) {
        throw new Error("User not found. Please check your email.");
      }

      // 2. Verify Password 
      // Note: Imported SQL users have hashed passwords ($2y$...). 
      // This simple check works for NEW users created via the app. 
      // For old users, you must reset their password in Supabase first.
      if (user.password !== password) {
        throw new Error("Incorrect password.");
      }

      // 3. Login Successful
      // Update the global role so the Dashboard shows the right features
      setRole(user.role); 
      
      // Redirect to Dashboard
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

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

          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg shadow-orange-900/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* DEBUG BUTTON (Keep for testing if needed, or remove) */}
            <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-white/5 transition-all text-sm opacity-50 hover:opacity-100">
               <Bug size={16} />
               Bypass Login (Debug)
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