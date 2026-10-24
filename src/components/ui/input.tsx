"use client";

import React from "react";
import { InputProps } from "./types";

function formatRupiah(value: string | number): string {
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/\./g, "").replace(/,/g, ""));
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function digitsOnly(str: string): string {
  return str.replace(/[^0-9]/g, "");
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

  const raw = String(value ?? "");

  // Accounting: tampilan SELALU berformat titik ribuan, baik fokus maupun tidak,
  // supaya tidak bolak-balik "kadang ada titik kadang tidak".
  const displayValue = accounting
    ? raw
      ? formatRupiah(digitsOnly(raw))
      : ""
    : raw;

  // User menghapus satu karakter tepat di pemisah titik → angka tidak berubah.
  // Tangkap kasus itu dan hapus digit sebelum caret secara manual, agar
  // backspace tidak terasa "mati" sekali di depan titik.
  const handleAccountingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    let digits = digitsOnly(el.value);
    if (digits === raw && raw !== "") {
      const caret = el.selectionStart ?? 0;
      const digitIndex = digitsOnly(el.value.slice(0, caret)).length;
      const idx = Math.max(0, digitIndex - 1);
      digits = raw.slice(0, idx) + raw.slice(idx + 1);
    }
    onValueChange?.(digits);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.(e.target.value);
  };

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
          type={accounting ? "text" : type}
          inputMode={accounting ? "numeric" : undefined}
          value={displayValue}
          onChange={accounting ? handleAccountingChange : handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`km-input-inner w-full bg-transparent text-sm ${fontMono ? "font-mono" : ""} text-slate-900 dark:text-slate-100 border-b border-slate-400/30 focus:border-amber-600 dark:focus:border-amber-500 outline-none transition-colors pr-8`}
          {...rest}
        />
        {accounting && raw ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
            Rp
          </span>
        ) : null}
        {error && (
          <span className="km-input-error-msg absolute -bottom-8 left-0 text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
