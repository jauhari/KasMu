"use client";

import React from "react";
import { CalendarDays } from "lucide-react";

interface DateTimePickerProps {
  label?: string;
  value?: string; // format "YYYY-MM-DDTHH:mm" (kompatibel datetime-local)
  onValueChange?: (v: string) => void;
  required?: boolean;
  className?: string;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function parseValue(v: string): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const [datePart, timePart] = v.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const dt = new Date(y, mo - 1, d, hh, mm);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function buildValue(y: number, mo: number, d: number, hh: number, mm: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(hh)}:${pad(mm)}`;
}

export function DateTimePicker({
  label,
  value = "",
  onValueChange,
  required,
  className = "",
}: DateTimePickerProps) {
  const selected = parseValue(value);
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Minggu/tahun yang sedang dilihat di panel
  const [viewYear, setViewYear] = React.useState(() =>
    selected ? selected.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState(() =>
    selected ? selected.getMonth() : new Date().getMonth()
  );
  const [timeList, setTimeList] = React.useState<null | "hour" | "minute">(null);

  // Saat panel dibuka: view = tanggal terpilih
  const openPanel = () => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    setTimeList(null);
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Min
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  const isTodayCell = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const setValue = (y: number, mo: number, d: number, hh: number, mm: number) =>
    onValueChange?.(buildValue(y, mo, d, hh, mm));

  const pickDay = (day: number) => {
    const hh = selected ? selected.getHours() : 0;
    const mm = selected ? selected.getMinutes() : 0;
    setValue(viewYear, viewMonth, day, hh, mm);
  };

  const shiftMonth = (n: number) => {
    const d = new Date(viewYear, viewMonth + n, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setTimeList(null);
  };

  // Tampilan trigger ringkas: "24 Okt 2026 · 08:26"
  const display = selected
    ? `${selected.getDate()} ${MONTHS_ID_SHORT[selected.getMonth()]} ${selected.getFullYear()} · ${String(
        selected.getHours()
      ).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`
    : "Pilih tanggal & jam…";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label className="km-input-label">
          {label}
          {required && <span className="km-input-req">*</span>}
        </label>
      )}
      <div
        className={`km-input-field relative group ${open ? "km-input-focused" : ""}`}
        onClick={open ? undefined : openPanel}
      >
        <div className="km-input-inner w-full bg-transparent text-sm cursor-pointer font-mono text-slate-900 dark:text-slate-100 border-b border-slate-400/30 focus:border-amber-600 dark:focus:border-amber-500 outline-none transition-colors pr-8 truncate">
          {display}
        </div>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {open ? "▲" : <CalendarDays className="w-3.5 h-3.5" />}
        </span>
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[19rem] max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#0c1220] border border-slate-400/60 shadow-lg select-none">
          {/* Navigasi bulan */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-700/50">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-mono"
              aria-label="Bulan sebelumnya"
            >
              ◀
            </button>
            <span className="text-xs font-bold text-white font-mono">
              {MONTHS_ID[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-mono"
              aria-label="Bulan berikutnya"
            >
              ▶
            </button>
          </div>

          {/* Grid kalender */}
          <div className="p-2">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-center text-[9px] font-bold uppercase text-amber-600/80 py-1"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`b${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected =
                  !!selected &&
                  selected.getFullYear() === viewYear &&
                  selected.getMonth() === viewMonth &&
                  selected.getDate() === day;
                const isToday = isTodayCell(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={`h-8 text-[11px] font-mono transition-colors ${
                      isSelected
                        ? "bg-amber-600 text-white font-bold"
                        : isToday
                          ? "border border-emerald-700/60 text-emerald-400 hover:bg-amber-900/20"
                          : "text-slate-300 hover:bg-amber-900/20"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pilih jam & menit (dropdown dalam-panel) */}
          <div className="border-t border-slate-700/50 p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimeList(timeList === "hour" ? null : "hour")}
                className={`flex-1 py-1.5 text-sm font-mono font-bold border transition-colors ${
                  timeList === "hour"
                    ? "border-amber-600 text-amber-500 bg-amber-900/20"
                    : "border-slate-700/60 text-white hover:bg-amber-900/20"
                }`}
              >
                {selected ? String(selected.getHours()).padStart(2, "0") : "00"}
              </button>
              <span className="text-sm font-mono text-slate-400">:</span>
              <button
                type="button"
                onClick={() => setTimeList(timeList === "minute" ? null : "minute")}
                className={`flex-1 py-1.5 text-sm font-mono font-bold border transition-colors ${
                  timeList === "minute"
                    ? "border-amber-600 text-amber-500 bg-amber-900/20"
                    : "border-slate-700/60 text-white hover:bg-amber-900/20"
                }`}
              >
                {selected ? String(selected.getMinutes()).padStart(2, "0") : "00"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setValue(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    now.getHours(),
                    now.getMinutes()
                  );
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                  setOpen(false);
                }}
                className="px-2 py-1.5 text-[10px] font-bold uppercase border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/20 transition-colors"
                title="Set ke waktu sekarang"
              >
                Now
              </button>
            </div>
            {timeList && (
              <div className="border border-slate-700/60 max-h-36 overflow-y-auto">
                {Array.from({ length: timeList === "hour" ? 24 : 60 }, (_, i) => i).map((n) => {
                  const isSelected =
                    !!selected &&
                    (timeList === "hour"
                      ? selected.getHours() === n
                      : selected.getMinutes() === n);
                  const pad = (x: number) => String(x).padStart(2, "0");
                  const choose = () => {
                    if (!selected) {
                      // Belum ada tanggal: pakai hari ini + n
                      const now = new Date();
                      if (timeList === "hour") setValue(now.getFullYear(), now.getMonth(), now.getDate(), n, 0);
                      else setValue(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), n);
                    } else if (timeList === "hour") {
                      setValue(viewYear, viewMonth, selected.getDate(), n, selected.getMinutes());
                    } else {
                      setValue(viewYear, viewMonth, selected.getDate(), selected.getHours(), n);
                    }
                    setTimeList(null);
                  };
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={choose}
                      className={`w-full py-1 text-[11px] font-mono text-center transition-colors ${
                        isSelected
                          ? "bg-amber-600/30 text-amber-400 font-bold"
                          : "text-slate-300 hover:bg-amber-900/20"
                      }`}
                    >
                      {pad(n)}
                    </button>
                  );
                })}
              </div>
            )}
            {required && !selected && (
              <p className="text-[9px] text-rose-400 italic">Tanggal wajib dipilih</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
