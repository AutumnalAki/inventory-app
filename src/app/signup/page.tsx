"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    accessCode: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Validate Access Code & Get Role
      const { data: roleData, error: roleError } = await supabase
        .from('role_keys')
        .select('role')
        .eq('role_key', formData.accessCode)
        .single();

      if (roleError || !roleData) {
        throw new Error("Invalid Access Code. Please ask your administrator for an invite.");
      }

      const assignedRole = roleData.role;

      // 2. Check if Email Already Exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        throw new Error("This email is already registered.");
      }

      // 3. Create New User
      // Note: We combine First+Last into 'username' to match your DB schema
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          username: fullName,
          email: formData.email,
          password: formData.password, // Storing as plain text per your current setup
          role: assignedRole,
          role_key: formData.accessCode,
          status: 'active'
        }]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      // 4. Success!
      setSuccess(true);
      setTimeout(() => {
        router.push("/signin");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to create account.");
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
            <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
            <p className="text-gray-400 text-sm mt-2">Join CDM LabTrack Workspace</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            
            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                <CheckCircle size={16} />
                Account created! Redirecting...
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Access Code</label>
              <input 
                type="text" 
                required
                placeholder="Enter your invite code"
                value={formData.accessCode}
                onChange={(e) => setFormData({...formData, accessCode: e.target.value})}
                className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">First Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Last Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || success}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white shadow-lg shadow-orange-900/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/signin" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">
                Sign in
              </Link>
            </p>
            
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