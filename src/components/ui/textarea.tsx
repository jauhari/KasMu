"use client";

import React from "react";

interface TextareaProps {
  label?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}

export function Textarea({
  label,
  value = "",
  onValueChange,
  placeholder = "",
  rows = 8,
  required,
  className = "",
}: TextareaProps) {
  return (
    <div className={`km-textarea-wrap ${className}`}>
      {label && (
        <label className="km-input-label">
          {label}
          {required && <span className="km-input-req">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[#0b0b0f] border border-slate-700 rounded-none p-3 font-mono text-[11px] text-slate-200 outline-none focus:border-amber-600 transition-colors resize-none"
      />
    </div>
  );
}
