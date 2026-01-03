"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, ArrowLeft, Loader2, AlertCircle, Mail, Lock, ArrowRight } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Auth Login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Check Profile Status
      const { data: profile } = await supabase
        .from('users')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (profile && profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error("Access Denied: Your account is inactive.");
      }

      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 font-sans text-white">
      <DynamicBackground />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="bg-orange-600 p-3 rounded-xl mb-4 shadow-lg shadow-orange-900/20">
              <Box size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-sm mt-2">Sign in to access your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"><AlertCircle size={16} /> {error}</div>}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input required type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                <Link href="#" className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors">Forgot Password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="group w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg shadow-orange-900/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-500">
              Don't have an account? <Link href="/signup" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">Create one</Link>
            </p>
            <div className="pt-4 border-t border-white/5">
                <Link href="/" className="inline-flex items-center text-xs text-gray-500 hover:text-white transition-colors"><ArrowLeft size={12} className="mr-1.5" /> Back to home</Link>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}