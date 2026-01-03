"use client";

import React, { createContext, useContext, useState } from "react";

type Role = "Administrator" | "Program Chair" | "Faculty" | "Student" | "Lab Technician";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // Default role for debugging. Change this to "Student" to test hiding.
  const [role, setRole] = useState<Role>("Administrator");

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within a RoleProvider");
  return context;
}