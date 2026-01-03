"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
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
      // 1. Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Check Custom Status in Public Table
      // (Optional: Supabase Auth handles basic login, but you might want to block 'inactive' users manually here or via RLS)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('status, role')
        .eq('id', data.user.id)
        .single();

      if (userData?.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error("Access Denied: Your account is inactive.");
      }

      // 3. Success - Redirect (Contexts will auto-update because they listen to Auth State)
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
            <div className="bg-orange-600 p-3 rounded-xl mb-4 shadow-lg"><Box size={32} className="text-white" /></div>
            <h2 className="text-2xl font-bold">Welcome Back</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"><AlertCircle size={16} /> {error}</div>}
            
            <input type="email" required placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
            <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
            
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg transition-all disabled:opacity-50 flex justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
             <p className="text-sm text-gray-500">Don't have an account? <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium">Create one</Link></p>
             <Link href="/" className="inline-flex items-center text-xs text-gray-500 hover:text-white"><ArrowLeft size={12} className="mr-1" /> Back to home</Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}