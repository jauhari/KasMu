"use client";

import React from "react";
import { InputProps } from "./types";

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
  ...rest
}: InputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const internalValue = React.useRef(String(value ?? ""));

  const syncInput = React.useCallback(() => {
    if (ref.current) {
      ref.current.value = String(value ?? "");
    }
  }, [value]);

  React.useEffect(() => {
    syncInput();
  }, [value, syncInput]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    internalValue.current = e.target.value;
    onValueChange?.(e.target.value);
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
          type={type}
          value={internalValue.current}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`km-input-inner w-full bg-transparent text-sm ${fontMono ? "font-mono" : ""} text-slate-900 dark:text-slate-100 border-b border-slate-400/30 focus:border-amber-600 dark:focus:border-amber-500 outline-none transition-colors pr-8`}
          {...rest}
        />
        {error && (
          <span className="km-input-error-msg absolute -bottom-8 left-0 text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
