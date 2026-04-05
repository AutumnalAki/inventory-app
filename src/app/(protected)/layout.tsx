"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { supabase } from "@/lib/supabase";

const ADMIN_ROLES = new Set([
  "developer",
  "superadmin",
  "administrator",
  "program chair",
  "faculty",
]);

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, loading: roleLoading } = useRole();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const signedIn = Boolean(data.session?.user);
      setIsSignedIn(signedIn);
      setSessionChecked(true);

      if (!signedIn) {
        router.replace("/signin");
      }
    };

    void runCheck();

    return () => {
      mounted = false;
    };
  }, [router]);

  const canAccess = useMemo(() => ADMIN_ROLES.has(String(role || "").toLowerCase()), [role]);

  useEffect(() => {
    if (!sessionChecked || roleLoading) return;
    if (isSignedIn && !canAccess) {
      router.replace("/dashboard");
    }
  }, [canAccess, isSignedIn, roleLoading, router, sessionChecked]);

  if (!sessionChecked || roleLoading || (isSignedIn && !canAccess)) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Verifying access...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
