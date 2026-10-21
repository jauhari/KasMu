"use client";

import React from "react";
import { InputProps } from "./types";

function formatRupiah(value: string | number): string {
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function parseRupiah(display: string): string {
  return String(display).replace(/\./g, "").replace(/,/g, "");
}

export function Input({
  label,
  value = "",
  onValueChange,
  type = "text",
  placeholder = "",
  error,
  required,
  className = "",
  fontMono,
  accounting,
  ...rest
}: InputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const internalValue = React.useRef(String(value ?? ""));

  const syncInput = React.useCallback(() => {
    if (ref.current) {
      const raw = String(value ?? "");
      ref.current.value = focused && accounting ? raw : formatRupiah(raw);
    }
  }, [value, focused, accounting]);

  React.useEffect(() => {
    syncInput();
  }, [value, focused, syncInput, accounting]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    internalValue.current = raw;
    onValueChange?.(raw);
  };

  const handleFocus = () => setFocused(true);
  const handleBlur = () => setFocused(false);

  return (
    <div className={`km-input-wrap ${className}`}>
      {label && (
        <label className="km-input-label">
          {label}
          {required && <span className="km-input-req">*</span>}
        </label>
      )}
      <div
        className={`km-input-field relative group ${focused ? "km-input-focused" : ""} ${
          error ? "km-input-error" : ""
        }`}
      >
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={internalValue.current}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`km-input-inner w-full bg-transparent text-sm ${fontMono ? "font-mono" : ""} text-slate-900 dark:text-slate-100 border-b border-slate-400/30 focus:border-amber-600 dark:focus:border-amber-500 outline-none transition-colors pr-8`}
          {...rest}
        />
        {accounting && internalValue.current && !focused && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
            Rp
          </span>
        )}
        {error && (
          <span className="km-input-error-msg absolute -bottom-8 left-0 text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
