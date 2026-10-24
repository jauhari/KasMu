"use client";

import React, { useEffect } from "react";
import { ModalProps } from "./types";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      onClick={(e) => {
        // Close hanya saat klik tepat di area gelap LUAR panel.
        // Klik di mana pun di dalam panel (termasuk area kosong/label)
        // target-nya bukan kontainer ini → tidak pernah close.
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`km-modal-panel bg-[#0c1220] border border-slate-700 rounded-none shadow-2xl ${sizes[size]} w-full max-h-[90vh] flex flex-col overflow-hidden`}
      >
        {title && (
          <div className="px-5 py-4 border-b border-slate-700 bg-[#0a0a0a]/50 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold tracking-tighter text-white uppercase letter-spacing-[0.05em]">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-none transition-colors text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 py-4 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
