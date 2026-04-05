"use client";

import React from "react";
import { clsx } from "clsx";

type SidebarProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Sidebar({ title, children, className }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm",
        className,
      )}
    >
      {title ? <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-300">{title}</h3> : null}
      <div className="space-y-3">{children}</div>
    </aside>
  );
}
