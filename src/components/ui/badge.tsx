"use client";

import React from "react";
import { BadgeProps } from "./types";

const variants: Record<string, string> = {
  default: "bg-slate-900 text-slate-300 border border-slate-700",
  success: "bg-emerald-900/40 text-emerald-400 border border-emerald-700/50",
  danger: "bg-rose-900/40 text-rose-400 border border-rose-700/50",
  warning: "bg-amber-900/40 text-amber-400 border border-amber-700/50",
  info: "bg-blue-900/40 text-blue-400 border border-blue-700/50",
};

export function Badge({
  variant = "default",
  children,
  className = "",
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`km-badge inline-flex items-center gap-1 text-[9px] font-bold tracking-tighter uppercase border px-2 py-0.5 rounded-none ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
