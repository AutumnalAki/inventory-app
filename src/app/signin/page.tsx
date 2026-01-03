// src/app/signin/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { usePopup } from "@/context/PopupContext";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import DynamicBackground from "@/components/DynamicBackground";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showAlert } = usePopup();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert({ title: "Error", message: error.message, variant: "error" });
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <DynamicBackground />
      <div className="w-full max-w-md z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            {/* BRAND ICON ADDED */}
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Image 
                src="/favicon.ico" 
                alt="Logo" 
                width={40} 
                height={40} 
                className="rounded-sm"
              />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Welcome Back</h1>
            <p className="text-gray-400 mt-2 text-sm">Sign in to manage your laboratory</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-600 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-600 transition-colors" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mt-6">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}