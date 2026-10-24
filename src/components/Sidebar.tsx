"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Contact,
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
  X,
  History,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const allNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, ownerOnly: false },
  { label: "Data Transaksi", href: "/transaksi", icon: Receipt, ownerOnly: false },
  { label: "Kontak Pelanggan", href: "/customers", icon: Contact, ownerOnly: false },
  { label: "Opname Cash", href: "/opname", icon: Lock, ownerOnly: false },
  { label: "Saldo Akun", href: "/saldo", icon: Wallet, ownerOnly: true },
  { label: "Keluar/Masuk Cash", href: "/mutasi-kas", icon: ArrowDownUp, ownerOnly: false },
  { label: "Hutang / Piutang", href: "/hutang-piutang", icon: FileSpreadsheet, ownerOnly: false },
  { label: "Laporan Keuangan", href: "/laporan", icon: BarChart3, ownerOnly: true },
  { label: "Staff", href: "/staff", icon: Users, ownerOnly: true },
  { label: "Backup & Restore", href: "/backup", icon: HardDriveDownload, ownerOnly: true },

  { label: "Log Perubahan", href: "/perubahan", icon: History, ownerOnly: false },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  user?: { name: string; role: string } | null;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(user || null);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Load current user session if not provided
  useEffect(() => {
    if (pathname === "/login" || user) return;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCurrentUser(json.data);
        }
      })
      .catch(console.error);
  }, [pathname, user]);

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

  const navContent = (
    <div className="flex flex-col justify-between h-full select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-none bg-[#15151a] text-white flex items-center justify-center font-bold text-base tracking-tight shrink-0 border border-slate-700">
              KM
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white truncate">
                  KasMu
                </h1>
                <span className="text-[10px] bg-[#15151a] text-amber-500 font-semibold px-1.5 py-0.2 border border-amber-700/50">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate">
                Mini-ATM & Keagenan
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-none text-slate-500 hover:text-white hover:bg-[#15151a] transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-600"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile, Theme Toggle & Lock Screen */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <div className="flex items-center gap-2.5 bg-[#15151a] p-2.5 rounded-none border border-slate-700">
          <div
            className={`w-7 h-7 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${
              isOwner
                ? "bg-amber-900/20 text-amber-400 border border-amber-700/50"
                : "bg-[#15151a] text-slate-400 border border-slate-700"
            }`}
          >
            {isOwner ? "OW" : "KS"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser?.name || "Memuat sesi..."}
            </p>
            <p className="text-[10px] text-slate-600 uppercase font-mono">
              {currentUser?.role === "OWNER" ? "Owner Access" : "Staff Kasir"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#15151a] hover:bg-slate-800 rounded-none text-[11px] font-bold text-slate-500 hover:text-white border border-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
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
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#15151a] hover:bg-[#15151a]/50 rounded-none text-[11px] font-bold text-slate-500 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Kunci</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0d0d11] border-r border-slate-700 flex-col justify-between h-screen fixed left-0 top-0 z-40 transition-colors duration-150">
        {navContent}
      </aside>

      {/* 2. Mobile Off-Canvas Drawer Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/85 backdrop-blur-xl z-50 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* 3. Mobile Off-Canvas Drawer Panel */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0d0d11] border-r border-slate-700 z-50 transition-transform duration-300 ease-out flex flex-col justify-between h-full ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
