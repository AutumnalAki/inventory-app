"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface RoleContextType {
  role: string;
  setRole: (role: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // Default to "Student" (least privilege) to avoid leaking admin features
  const [role, setRoleState] = useState("Student");

  // 1. Load role from Local Storage when the app starts
  useEffect(() => {
    const storedRole = localStorage.getItem("labTrack_role");
    if (storedRole) {
      setRoleState(storedRole);
    }
  }, []);

  // 2. Save role to Local Storage whenever it changes
  const setRole = (newRole: string) => {
    setRoleState(newRole);
    localStorage.setItem("labTrack_role", newRole);
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}