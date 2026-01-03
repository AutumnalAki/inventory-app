"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ThemeContextType {
  accent: string;
  setAccent: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<string>("orange");

  useEffect(() => {
    const initTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('theme_color')
          .eq('id', session.user.id)
          .single();
        if (data?.theme_color) setAccentState(data.theme_color);
      }
    };
    initTheme();
  }, []);

  const setAccent = async (newAccent: string) => {
    setAccentState(newAccent); // Update UI immediately
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('users')
        .update({ theme_color: newAccent })
        .eq('id', session.user.id);
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