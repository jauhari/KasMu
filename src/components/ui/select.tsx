"use client";

import React from "react";
import { SelectProps } from "./types";

export function Select({
  label,
  value = "",
  onValueChange,
  options,
  placeholder = "Pilih opsi",
  error,
  required,
  className = "",
  ...rest
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const opt = options.find((o) => o.value === value);
    setDisplayValue(opt ? opt.label : placeholder);
  }, [value, options, placeholder]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optValue: string, optLabel: string) => {
    setDisplayValue(optLabel);
    onValueChange?.(optValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`km-select-wrap ${className}`}>
      {label && (
        <label className="km-select-label">
          {label}
          {required && <span className="km-select-req">*</span>}
        </label>
      )}
      <div
        className={`km-select-field relative group ${open ? "km-select-open" : ""} ${
          error ? "km-select-error" : ""
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <div
          className="km-select-trigger w-full bg-transparent text-sm font-mono text-slate-900 dark:text-slate-100 border-b border-slate-400/30 focus:border-amber-600 dark:focus:border-amber-500 outline-none px-1 py-2.5 cursor-pointer"
        >
          <span className="km-select-display truncate">{displayValue}</span>
          <span className="km-select-caret ml-1 text-[10px] text-slate-400">
            {open ? "▲" : "▼"}
          </span>
        </div>
        {open && (
          <div className="km-select-list absolute z-50 w-full bg-white dark:bg-[#0c1220] border border-slate-400/60 mt-0.5 max-h-48 overflow-y-auto shadow-lg">
            {options.map((opt: { value: string; label: string }) => (
              <div
                key={opt.value}
                className={`km-select-option px-3 py-2 text-xs font-mono cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 ${
                  opt.value === value
                    ? "bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold"
                    : "text-slate-700 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0"
                }`}
                onClick={(e) => {
                  // stopPropagation: tanpa ini klik opsi bubble ke toggle field
                  // (ikut tombol kotak) — dropdown tertutup lalu terbuka lagi.
                  e.stopPropagation();
                  handleSelect(opt.value, opt.label);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
        {error && (
          <span className="km-select-error-msg absolute -bottom-8 left-0 text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
