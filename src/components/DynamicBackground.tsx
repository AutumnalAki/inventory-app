"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function DynamicBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Increased damping slightly for an even smoother, heavier feel
  const springConfig = { damping: 35, stiffness: 120, mass: 0.8 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Offset by 300px (half the orb width) to center it
      mouseX.set(e.clientX - 300);
      mouseY.set(e.clientY - 300);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black pointer-events-none">
      {/* REMOVED: The Noise Overlay div. 
         Now the background is pure deep black.
      */}

      {/* Main Spotlight Orb */}
      <motion.div
        style={{
          x: springX,
          y: springY,
        }}
        className="absolute w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-[100px] opacity-50 mix-blend-screen"
      />

      {/* Inner Core - Brighter & Sharper */}
      <motion.div
        style={{
          x: springX,
          y: springY,
        }}
        className="absolute w-[300px] h-[300px] top-[150px] left-[150px] bg-orange-500/15 rounded-full blur-[60px] opacity-100"
      />
    </div>
  );
}