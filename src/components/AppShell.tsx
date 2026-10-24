"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Receipt,
  Plus,
  Lock,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import QuickTransactionModal from "./QuickTransactionModal";

interface AppShellProps {
  children: React.ReactNode;
  initialUser?: { name: string; role: string; username?: string } | null;
}

export default function AppShell({ children, initialUser }: AppShellProps) {
  const pathname = usePathname();
  const isLoginPage = !pathname || pathname === "/login" || pathname.startsWith("/login");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(
    initialUser || null
  );
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
    }
  }, [initialUser]);

  // Load current user for mobile header tag if not passed from server
  useEffect(() => {
    if (isLoginPage || initialUser) return;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCurrentUser(json.data);
      })
      .catch(console.error);
  }, [pathname, isLoginPage, initialUser]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const isOwner = currentUser?.role === "OWNER";

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#050507] text-white transition-colors">
      {/* 1. Responsive Sidebar (Desktop Fixed + Mobile Slide Drawer) */}
      <Sidebar
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        user={currentUser}
      />

      {/* 2. Mobile Sticky Top Header (Only on < lg screens) */}
      <header className="lg:hidden sticky top-0 z-30 w-full h-14 bg-[#0d0d11]/95 backdrop-blur-md border-b border-slate-700 px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-none bg-[#15151a] text-white flex items-center justify-center font-bold text-sm border border-slate-700">
            KM
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-white">
              KasMu
            </span>
            <span className="text-[9px] bg-[#15151a] text-amber-500 font-semibold px-1.5 py-0.5 border border-amber-700/50">
              PRO
            </span>
          </div>
        </div>

        {/* Right action icons on mobile header */}
        <div className="flex items-center gap-1.5">
          {/* User Badge */}
          {currentUser && (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isOwner
                  ? "bg-amber-900/20 text-amber-400 border border-amber-700/50"
                  : "bg-[#15151a] text-slate-400 border border-slate-700"
              }`}
            >
              {isOwner ? "Owner" : "Kasir"}
            </span>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Ganti Tema"
            className="w-9 h-9 flex items-center justify-center rounded-none bg-[#15151a] text-slate-500 border border-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>

          {/* Hamburger Drawer Toggle */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Buka Menu"
            className="w-9 h-9 flex items-center justify-center rounded-none bg-[#15151a] text-slate-400 border border-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. Main Content Container (Full width on mobile, shifted on desktop) */}
      <main className="flex-1 w-full lg:ml-64 min-h-screen px-3.5 sm:px-6 lg:p-8 pt-3 sm:pt-6 pb-28 overflow-y-auto">
        {children}
      </main>

      {/* 4. Mobile Fixed Bottom Navigation Bar (Ultra-responsive thumb reach) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0d0d11]/95 backdrop-blur-md border-t border-slate-700/80 px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] flex items-center justify-around select-none">
        {/* Beranda */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
            pathname === "/"
              ? "text-blue-500 font-bold"
              : "text-slate-600 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Beranda</span>
        </Link>

        {/* Transaksi */}
        <Link
          href="/transaksi"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
            pathname === "/transaksi"
              ? "text-blue-500 font-bold"
              : "text-slate-600 hover:text-white"
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Transaksi</span>
        </Link>

        {/* Center Elevated Floating Action Button (+ Transaksi Baru) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => setQuickTxOpen(true)}
            aria-label="Catat Transaksi Baru"
            className="w-13 h-13 rounded-none bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-amber-600/20"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Opname Cash */}
        <Link
          href="/opname"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
            pathname === "/opname"
              ? "text-blue-500 font-bold"
              : "text-slate-600 hover:text-white"
          }`}
        >
          <Lock className="w-5 h-5 mb-0.5" />
          <span>Opname</span>
        </Link>

        {/* Menu Lengkap (Opens Drawer) */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors text-slate-600 hover:text-white active:scale-95 cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Global Quick Transaction Modal triggered from Mobile FAB */}
      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={() => {
          setQuickTxOpen(false);
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
