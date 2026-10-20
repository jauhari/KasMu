"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Lock,
  Wallet,
  ArrowDownUp,
  FileSpreadsheet,
  BarChart3,
  Users,
  Sun,
  Moon,
  LogOut,
  HardDriveDownload,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const allNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, ownerOnly: false },
  { label: "Data Transaksi", href: "/transaksi", icon: Receipt, ownerOnly: false },
  { label: "Opname Cash", href: "/opname", icon: Lock, ownerOnly: false },
  { label: "Saldo Akun", href: "/saldo", icon: Wallet, ownerOnly: true },
  { label: "Keluar/Masuk Cash", href: "/mutasi-kas", icon: ArrowDownUp, ownerOnly: false },
  { label: "Hutang / Piutang", href: "/hutang-piutang", icon: FileSpreadsheet, ownerOnly: false },
  { label: "Laporan Keuangan", href: "/laporan", icon: BarChart3, ownerOnly: true },
  { label: "Staff", href: "/staff", icon: Users, ownerOnly: true },
  { label: "Backup & Restore", href: "/backup", icon: HardDriveDownload, ownerOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  // Load current user session
  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCurrentUser(json.data);
        }
      })
      .catch(console.error);
  }, [pathname]);

  // Don't render sidebar on login page
  if (pathname === "/login") {
    return null;
  }

  const isOwner = currentUser?.role === "OWNER";

  // Filter navigation items based on role
  const visibleNavItems = allNavItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    return true;
  });

  const handleLockScreen = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.info("Layar kasir berhasil dikunci");
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#0c1220] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none transition-colors duration-150">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base tracking-tight shrink-0 shadow-sm">
            KM
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white truncate">
                KasMu
              </h1>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 font-semibold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-900">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Mini-ATM & Keagenan
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-220px)]">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile, Theme Toggle & Lock Screen */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
              isOwner
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
            }`}
          >
            {isOwner ? "OW" : "KS"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
              {currentUser?.name || "Memuat sesi..."}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">
              {currentUser?.role === "OWNER" ? "Owner Access" : "Staff Kasir"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span>Gelap</span>
              </>
            )}
          </button>

          {/* Lock Screen */}
          <button
            onClick={handleLockScreen}
            title="Kunci Layar Kasir"
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Kunci</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
