"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, AlertCircle, Lock } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const router = useRouter();
  
  // 🔒 Define your Access Code here
  const INVITE_CODE = "CDM2025"; 

  const [formData, setFormData] = useState({
    firstName: "", 
    lastName: "", 
    email: "", 
    password: "", 
    confirmPassword: "", 
    accessCode: "" 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Check Passwords
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // 2. Check Access Code
    if (formData.accessCode !== INVITE_CODE) {
      setError("Invalid Access Code. Please contact your administrator.");
      setLoading(false);
      return;
    }

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // 3. Sign Up
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            role: "Student",
            // No student_id or google_id sent here
          }
        }
      });

      if (authError) throw authError;

      alert("Account created successfully! You can now sign in.");
      router.push("/signin");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Please try again.");
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
            <div className="bg-indigo-600 p-3 rounded-xl mb-4 shadow-lg"><UserPlus size={32} className="text-white" /></div>
            <h2 className="text-2xl font-bold">Create Account</h2>
            <p className="text-xs text-gray-400 mt-1">Join the exclusive workspace</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"><AlertCircle size={16} /> {error}</div>}
            
            {/* Access Code Input */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-2">
                <label className="text-xs font-bold text-indigo-300 uppercase mb-1 flex items-center gap-1"><Lock size={10}/> Access Code</label>
                <input required type="text" placeholder="Enter Invite Code" value={formData.accessCode} onChange={(e) => setFormData({...formData, accessCode: e.target.value})} className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 placeholder:text-gray-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input required type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
              <input required type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <input required type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
            
            <input required type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
            <input required type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg transition-all disabled:opacity-50 flex justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
             Already have an account? <Link href="/signin" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign In</Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}