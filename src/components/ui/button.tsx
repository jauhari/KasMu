"use client";

import React from "react";
import { ButtonProps } from "./types";

const base =
  "inline-flex items-center justify-center gap-2 text-xs font-bold tracking-tighter uppercase select-none border border-transparent focus:outline-none disabled:opacity-50 disabled:pointer-events-none transition-colors duration-100";

const variants: Record<string, string> = {
  solid: "bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-700 border-amber-600",
  ghost: "bg-transparent text-amber-900 hover:bg-amber-50 active:bg-amber-100 border-transparent",
  outline: "bg-transparent text-slate-900 border border-slate-300 hover:bg-slate-100 active:bg-slate-200",
  danger: "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 border-rose-600",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
  lg: "px-5 py-2.5",
};

export function Button({
  className = "",
  variant = "solid",
  size = "md",
  children,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
