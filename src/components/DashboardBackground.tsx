import React from "react";

export default function DashboardBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none">
      {/* 1. Top Center Glow: 
           Changed from 'bg-orange-900/20' to 'bg-orange-600/30' 
           (Brighter color, slightly higher opacity)
      */}
      <div 
        className="absolute top-[-20%] left-[10%] right-[10%] h-[600px] rounded-full bg-orange-800/20 blur-[120px]" 
      />

      {/* 2. Bottom Right Glow:
           Changed from 'bg-red-900/10' to 'bg-red-600/20'
           (More visible red ambient light)
      */}
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-red-600/30 blur-[120px]" 
      />
      
      {/* 3. Overall Gradient Wash:
           Changed 'via-black/80' to 'via-black/40'.
           This reduces the heavy darkness in the middle of the screen,
           letting more of the colored glow shine through.
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
    </div>
  );
}