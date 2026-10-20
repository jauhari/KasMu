"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, WifiOff } from "lucide-react";

interface HeaderProps {
  onOpenQuickTx: () => void;
  title?: string;
  subtitle?: string;
}

export default function Header({ onOpenQuickTx, title, subtitle }: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      setTimeStr(now.toLocaleDateString("id-ID", options) + " WIB");
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title || "Dashboard Pembukuan"}
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
            <WifiOff className="w-3 h-3" />
            100% Offline
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono">{timeStr || "Memuat waktu..."}</span>
          {subtitle && (
            <>
              <span>•</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{subtitle}</span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onOpenQuickTx}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Transaksi Baru (F2)</span>
      </button>
    </header>
  );
}
