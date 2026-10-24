"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import ReceiptModal from "@/components/ReceiptPrinter";
import { formatRupiah, formatNumber } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  Activity,
  ArrowDownUp,
  Printer,
  Receipt,
  ShieldCheck,
  Plus,
  Lock,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";

// Palet grafik selaras desain terminal-amber (aksen utama = amber)
const PIE_COLORS = ["#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e", "#38bdf8"];
// Warna default lama dari data awal — dianggap "belum ditata" dan diganti palet tema
const LEGACY_DEFAULT_COLOR = "#2563eb";
const colorFor = (acc: { color?: string | null }, index: number) =>
  acc.color && acc.color !== LEGACY_DEFAULT_COLOR
    ? acc.color
    : PIE_COLORS[index % PIE_COLORS.length];
// Tooltip Recharts ikut design system: sudut tajam, panel tema, mono
const tooltipStyle = (isDark: boolean) => ({
  backgroundColor: isDark ? "#15151a" : "#ffffff",
  border: `1px solid ${isDark ? "#334155" : "#94a3b8"}`,
  borderRadius: 0,
  fontSize: "11px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  boxShadow: "none",
  padding: "6px 10px",
});
const pieLegendName = (name: any) => String(name ?? "");

interface DashboardClientProps {
  initialData?: any;
  currentUser?: {
    userId: string;
    username: string;
    name: string;
    role: "OWNER" | "STAFF";
  } | null;
}

export default function DashboardClient({ initialData, currentUser }: DashboardClientProps) {
  const [data, setData] = useState<any>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/dashboard", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.warn("Background dashboard sync error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      loadData();
    }
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [initialData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="text-slate-600 text-xs flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Memuat data KasMu...</span>
        </div>
        <button
          onClick={loadData}
          className="text-[11px] text-blue-500 underline hover:opacity-80 transition-opacity cursor-pointer"
        >
          Muat ulang manual
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.role === "OWNER" || data?.isOwner === true;

  const kpi = data?.kpi || {
    profitToday: 0,
    profitMonth: 0,
    countToday: 0,
    turnoverToday: 0,
    cashMutationToday: 0,
    myCountToday: 0,
    myTurnoverToday: 0,
    drawerStatus: "Siap Operasional",
  };

  const accounts = data?.accounts || [];
  // Pie tak bisa menggambar nilai negatif — tampilkan hanya saldo positif
  const pieAccounts = accounts.filter((a: any) => Number(a.balance) > 0);
  const totalBalance = data?.totalBalance || 0;
  const latestTxs = data?.latestTransactions || [];
  const chartData = data?.chartData || [];

  const isDark = theme === "dark";

  return (
    <div className="space-y-4 sm:space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title={isOwner ? "Dashboard Pembukuan" : "Dashboard Kasir"}
        subtitle={currentUser ? currentUser.name : isOwner ? "Pemilik Toko" : "Kasir Bertugas"}
      />

      {/* === 1. KPI METRIC CARDS (2x2 Grid on Mobile, 4 Cols on Desktop) === */}
      {isOwner ? (
        /* OWNER KPI CARDS */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Profit Hari Ini */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Profit Hari Ini</span>
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
              {formatRupiah(kpi.profitToday)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium truncate">
              Laba bersih fee toko
            </p>
          </div>

          {/* Card 2: Profit Bulanan */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Profit Bulanan</span>
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
            </div>
            <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
              {formatRupiah(kpi.profitMonth)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 truncate">
              Sudah potong biaya
            </p>
          </div>

          {/* Card 3: Total Transaksi Hari Ini */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Transaksi Hari Ini</span>
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>
            <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
              {formatNumber(kpi.countToday)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 truncate">
              Nasabah terlayani
            </p>
          </div>

          {/* Card 4: Biaya Operasional */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Biaya Operasional</span>
              <ArrowDownUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <div
              className={`text-base sm:text-2xl font-bold font-mono tracking-tight truncate ${
                kpi.cashMutationToday < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-white"
              }`}
            >
              {formatRupiah(kpi.cashMutationToday)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 truncate">
              Arus kas laci toko
            </p>
          </div>
        </div>
      ) : (
        /* KASIR / STAFF KPI CARDS (Safe & Operation-Focused) */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Transaksi Saya */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Transaksi Saya</span>
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
            </div>
            <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
              {formatNumber(kpi.myCountToday || kpi.countToday)} Trx
            </div>
            <p className="text-[10px] sm:text-[11px] text-blue-500 mt-0.5 font-medium truncate">
              Nasabah dilayani shift ini
            </p>
          </div>

          {/* Card 2: Volume Transaksi Saya */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Volume Transaksi</span>
              <ArrowDownUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
              {formatRupiah(kpi.myTurnoverToday || kpi.turnoverToday)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium truncate">
              Perputaran uang nasabah
            </p>
          </div>

          {/* Card 3: Total Transaksi Semua Kasir */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Semua Loket</span>
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>
            <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
              {formatNumber(kpi.countToday)} Trx
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 truncate">
              Total toko hari ini
            </p>
          </div>

          {/* Card 4: Status Kas Laci */}
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 sm:p-4 transition-colors">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate">Kas Laci</span>
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            </div>
            <div className="text-base sm:text-xl font-bold tracking-tight text-amber-500 truncate">
              {kpi.drawerStatus || "Normal"}
            </div>
            <Link
              href="/opname"
              className="text-[10px] sm:text-[11px] text-blue-500 hover:underline mt-0.5 block font-medium truncate"
            >
              Hitung fisik laci →
            </Link>
          </div>
        </div>
      )}

      {/* Kasir Quick Action Bar (Only for Staff / Kasir) */}
      {!isOwner && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-none bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm active:scale-98 transition-all cursor-pointer shadow-amber-600/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Catat Transaksi Baru (F2)</span>
          </button>
          <Link
            href="/opname"
            className="flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-none bg-[#0d0d11] border border-slate-700 hover:bg-[#15151a]/50 text-slate-400 hover:text-white font-bold text-xs sm:text-sm active:scale-98 transition-all"
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Hitung Opname Kas Laci</span>
          </Link>
        </div>
      )}

      {/* === 2. MIDDLE ROW: TRANSAKSI TERAKHIR & (OWNER: SALDO AKUN / KASIR: SHORTCUTS) === */}
      <div className={`grid grid-cols-1 ${isOwner ? "lg:grid-cols-2" : ""} gap-4 sm:gap-6`}>
        {/* Left: Transaksi Terakhir */}
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Transaksi Terakhir</h3>
              <p className="text-[10px] sm:text-xs text-slate-600">
                {isOwner ? "Aktivitas layanan perbankan hari ini" : "Transaksi perbankan kasir terbaru"}
              </p>
            </div>
            <Link href="/transaksi" className="text-xs font-semibold text-blue-500 hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-2">
            {latestTxs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Belum ada transaksi</div>
            ) : (
              latestTxs.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-none border border-slate-700/60 hover:bg-[#15151a]/50 transition-colors group text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                      <span className="truncate">{tx.category.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-slate-600 font-mono shrink-0">
                        ({tx.account?.name || "Provider"})
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5 truncate">
                      Nominal: {formatRupiah(tx.amount)}
                      <span className="mx-1">•</span>
                      {new Date(tx.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                        +{formatRupiah(isOwner ? tx.netProfit : tx.customerFee || 0)}
                      </div>
                      <span className="inline-block text-[8px] sm:text-[9px] font-medium text-emerald-400 bg-emerald-900/20 px-1 rounded border border-emerald-700/50">
                        {isOwner ? "SUKSES" : "FEE JASA"}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedTxForReceipt(tx)}
                      title="Cetak Struk"
                      className="p-1.5 rounded-none bg-[#15151a] hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Komposisi Saldo Akun (OWNER ONLY) */}
        {isOwner && (
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 sm:p-5 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">Komposisi Saldo Akun</h3>
                <p className="text-[10px] sm:text-xs text-slate-600">Distribusi modal digital & bank</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider block">Total Modal</span>
                <span className="text-sm sm:text-base font-bold font-mono text-blue-500">
                  {formatRupiah(totalBalance)}
                </span>
              </div>
            </div>

            <div className="h-40 sm:h-44 w-full flex items-center justify-center my-2">
              {pieAccounts.length === 0 ? (
                <p className="text-slate-400 text-xs">
                  {accounts.length === 0
                    ? "Belum ada akun saldo"
                    : "Belum ada saldo positif untuk ditampilkan"}
                </p>
              ) : mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieAccounts}
                      dataKey="balance"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieAccounts.map((acc: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colorFor(acc, index)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        formatRupiah(Number(value)),
                        pieLegendName(name),
                      ]}
                      contentStyle={tooltipStyle(isDark)}
                      itemStyle={{ color: "#e2e8f0", fontFamily: "inherit" }}
                      labelStyle={{ display: "none" }}
                      cursor={{ fill: "rgba(148,163,184,0.05)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Menyiapkan komposisi saldo...
                </div>
              )}
            </div>

            {/* Account Legend */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {accounts.slice(0, 4).map((acc: any, index: number) => (
                <div key={acc.id} className="flex items-center gap-1.5 text-xs truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorFor(acc, index) }}
                  ></span>
                  <span className="text-slate-400 truncate text-[11px]">{acc.name}</span>
                  <span className="text-slate-600 font-mono text-[10px] ml-auto shrink-0">
                    {formatRupiah(acc.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === 3. BOTTOM: GRAFIK PERTUMBUHAN PROFIT (OWNER ONLY) === */}
      {isOwner && (
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Tren Pertumbuhan Profit</h3>
              <p className="text-[10px] sm:text-xs text-slate-600">Grafik laba bersih operasional harian</p>
            </div>
            <div className="flex items-center gap-1 bg-[#15151a] p-0.5 rounded-none border border-slate-700 text-[10px] sm:text-xs">
              <button
                onClick={() => setChartView("weekly")}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-medium transition-all cursor-pointer ${
                  chartView === "weekly"
                    ? "bg-[#15151a] text-blue-500 font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setChartView("monthly")}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-medium transition-all cursor-pointer ${
                  chartView === "monthly"
                    ? "bg-[#15151a] text-blue-500 font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                30 Hari
              </button>
            </div>
          </div>

          <div className="h-52 sm:h-60 w-full min-w-0">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#f1f5f9"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatRupiah(Number(val)), "Profit"]}
                    contentStyle={tooltipStyle(isDark)}
                    itemStyle={{ color: "#f59e0b" }}
                    cursor={{ stroke: "#334155" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Menyiapkan grafik profit...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kasir Operational Quick Help (Only for Staff / Kasir) */}
      {!isOwner && (
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 rounded-none p-4 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-white">Panduan Shift Kasir:</p>
            <p>1. Selalu catat transaksi segera setelah nasabah menyetorkan atau menarik uang tunai.</p>
            <p>2. Tekan tombol <strong>F2</strong> di keyboard atau tombol <strong>+</strong> di navigasi bawah untuk membuka form transaksi kilat.</p>
            <p>3. Lakukan <strong>Opname Kas Laci</strong> di menu bawah pada saat pergantian shift atau tutup loket.</p>
          </div>
        </div>
      )}

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />

      <ReceiptModal
        transaction={selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
      />
    </div>
  );
}
