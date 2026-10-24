"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, WifiOff } from "lucide-react";

interface HeaderProps {
  onOpenQuickTx?: () => void;
  title?: string;
  subtitle?: string;
}

function getIndonesianDateTime() {
  const now = new Date();
  return (
    now.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

export default function Header({ onOpenQuickTx, title, subtitle }: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>(getIndonesianDateTime);

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(getIndonesianDateTime());
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-5 mb-4 sm:mb-6 border-b border-slate-700/80">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
            {title || "Dashboard Pembukuan"}
          </h2>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-none bg-emerald-900/20 text-emerald-400 border border-emerald-700/50 shrink-0">
            <WifiOff className="w-2.5 h-2.5" />
            100% Offline
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-mono text-[11px] truncate" suppressHydrationWarning>
            {timeStr}
          </span>
          {subtitle && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-medium truncate">
                {subtitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Button only on desktop/tablet; on mobile it is in the bottom bar */}
      {onOpenQuickTx && (
        <button
          onClick={onOpenQuickTx}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-none bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs active:scale-95 cursor-pointer shrink-0 shadow-amber-600/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Transaksi Baru (F2)</span>
        </button>
      )}
    </header>
  );
}
