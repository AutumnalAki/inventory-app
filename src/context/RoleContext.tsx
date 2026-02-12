"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const RoleContext = createContext<any>(null);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState("Student");
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check localStorage for persisted session
    const persistedUserId = localStorage.getItem("labTrack_userid");
    if (persistedUserId) {
      fetchUserRole(persistedUserId);
    } else {
      // 2. Check active session on load
      const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          localStorage.setItem("labTrack_userid", session.user.id);
          fetchUserRole(session.user.id);
        } else {
          setLoading(false);
        }
      };
      checkUser();
    }

    // 3. Listen for login/logout events automatically
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.setItem("labTrack_userid", session.user.id);
        fetchUserRole(session.user.id);
      } else {
        setRole("Student");
        localStorage.removeItem("labTrack_userid");
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) {
        // Normalize role to Title Case for consistent matching across the app
        const raw = String(data.role || "").trim();
        const titleCase = raw
          .split(/\s+/)
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        // Map common aliases to canonical role names (especially CSR)
        const aliasMap: Record<string, string> = {
          'csr': 'Central Storage Room',
          'csr (central storage room)': 'Central Storage Room',
          'central storage': 'Central Storage Room',
          'central storageroom': 'Central Storage Room',
          'centralstorageroom': 'Central Storage Room'
        };
        const lookup = raw.toLowerCase();
        if (aliasMap[lookup]) {
          setRole(aliasMap[lookup]);
        } else {
          setRole(titleCase || raw);
        }
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole, previewRole, setPreviewRole, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);