"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// We allow any string now (for Hex codes), not just specific names
interface ThemeContextType {
  accent: string;
  setAccent: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<string>("orange");

  useEffect(() => {
    // 1. Fetch the user's saved theme from DB on mount
    const fetchUserTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('theme_color')
          .eq('id', session.user.id) // Supabase Auth ID usually matches your users table ID logic
          .single();
        
        // If we found a saved color, use it. Otherwise default to orange.
        if (data?.theme_color) {
          setAccentState(data.theme_color);
        }
      } else {
        // Fallback for non-logged in users (optional: check local storage)
        const local = localStorage.getItem("labTrack_accent");
        if (local) setAccentState(local);
      }
    };

    fetchUserTheme();
  }, []);

  const setAccent = async (newAccent: string) => {
    // 1. Update State immediately for UI feedback
    setAccentState(newAccent);
    
    // 2. Save to LocalStorage (as backup/fast load)
    localStorage.setItem("labTrack_accent", newAccent);

    // 3. Save to Database (Permanent Account Storage)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Assuming your 'users' table is linked via the ID
      // You might need to adjust if your 'users' table uses a different ID than auth.uid()
      // But based on your previous code, we stored 'labTrack_userid' in localStorage.
      const storedId = localStorage.getItem("labTrack_userid");
      
      if (storedId) {
        await supabase
          .from('users')
          .update({ theme_color: newAccent })
          .eq('id', storedId);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}