"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardBackground() {
  const { accent } = useTheme();

  // Helper: If accent is a preset name, return hex. If it's a hex, return it as is.
  const getColor = (color: string) => {
    const presets: Record<string, string> = {
      orange: "#ea580c", // orange-600
      blue:   "#2563eb", // blue-600
      purple: "#9333ea", // purple-600
      emerald:"#059669", // emerald-600
      rose:   "#e11d48", // rose-600
    };
    return presets[color] || color; 
  };

  const activeColor = getColor(accent);

  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none transition-colors duration-700">
      
      {/* 1. Top Left Glow (Primary Color) */}
      <div 
        className="absolute top-[-20%] left-[10%] right-[10%] h-[600px] rounded-full blur-[120px] transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundColor: activeColor, 
          opacity: 0.25 
        }}
      />

      {/* 2. Bottom Right Glow (Subtler) */}
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundColor: activeColor, 
          opacity: 0.15 
        }}
      />
      
      {/* 3. Texture Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
    </div>
  );
}