"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, KeyRound, Mail, Lock, User } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "", accessCode: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // 1. Validate Access Code (Use correct table 'access_codes')
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('role')
        .eq('code', formData.accessCode)
        .single();

      if (codeError || !codeData) {
        throw new Error("Invalid Invite Code.");
      }

      const assignedRole = codeData.role;
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // 2. Sign Up with Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: fullName, role: assignedRole } }
      });

      if (authError) throw authError;

      setSuccess(true);
      setTimeout(() => { router.push("/signin"); }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 font-sans text-white">
      <DynamicBackground />

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="flex flex-col items-center mb-6">
            <div className="bg-orange-600 p-3 rounded-xl mb-4 shadow-lg shadow-orange-900/20">
              <UserPlus size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
            <p className="text-gray-400 text-sm mt-2">Join Workspace</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            
            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                <CheckCircle size={16} /> Account created! Redirecting...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Invite Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-orange-300 uppercase tracking-wider ml-1">Invite Code</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
                <input required type="text" placeholder="e.g. FACULTY-2025" value={formData.accessCode} onChange={(e) => setFormData({...formData, accessCode: e.target.value})} className="w-full bg-black/20 border border-orange-500/30 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 font-mono tracking-widest transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">First Name</label>
                  <input required type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Last Name</label>
                  <input required type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input required type="email" placeholder="you@school.edu" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input required type="password" placeholder="••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Confirm</label>
                    <input required type="password" placeholder="••••••" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                </div>
            </div>

            <button type="submit" disabled={loading || success} className="group w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg shadow-orange-900/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-500">
              Already have an account? <Link href="/signin" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">Sign in</Link>
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