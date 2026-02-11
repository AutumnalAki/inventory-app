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
  React.useEffect(() => {
    // Only redirect if Supabase session exists
    const checkSession = async () => {
      if (typeof window === "undefined") return;
      const { data: { session } } = await require("@/lib/supabase").supabase.auth.getSession();
      if (session?.user) {
        window.location.href = "/dashboard";
      }
    };
    checkSession();
  }, []);
  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#050505]">
      <DynamicBackground />
      {/* ...existing code... */}
    </div>
  );
}