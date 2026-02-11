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
    // If user is signed in, redirect to dashboard
    const userId = typeof window !== "undefined" ? localStorage.getItem("labTrack_userid") : null;
    if (userId) {
      window.location.href = "/dashboard";
    }
  }, []);
  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#050505]">
      <DynamicBackground />
      {/* ...existing code... */}
    </div>
  );
}