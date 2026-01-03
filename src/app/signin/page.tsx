"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";

const capitalizeRole = (role: string) => {
  if (!role) return "Student";
  return role.replace(/\b\w/g, char => char.toUpperCase());
};

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
      // 1. Fetch User
      const { data: user, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (dbError || !user) {
        throw new Error("User not found.");
      }

      // 2. Verify Password
      if (user.password !== password) {
        throw new Error("Incorrect password.");
      }

      // 3. CHECK STATUS (New Logic) 
      // The database stores status as 'active' or 'inactive' (lowercase)
      if (user.status !== 'active') {
        throw new Error("Access Denied: Your account has been deactivated.");
      }

      // 4. Success - Set Role & ID
      const normalizedRole = capitalizeRole(user.role);
      setRole(normalizedRole); 
      localStorage.setItem("labTrack_userid", user.id.toString());

      // 5. Redirect
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="bg-orange-600 p-3 rounded-xl mb-4 shadow-lg shadow-orange-900/20">
              <Box size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-sm mt-2">Sign in to access your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="you@school.edu"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                <Link href="#" className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors">Forgot Password?</Link>
              </div>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg shadow-orange-900/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Link href="/signup" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">
                Create one
              </Link>
            </p>
            
            <div className="pt-4 border-t border-white/5">
                <Link href="/" className="inline-flex items-center text-xs text-gray-500 hover:text-white transition-colors">
                <ArrowLeft size={12} className="mr-1.5" /> Back to home
                </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}