"use client";

export const dynamic = "force-dynamic";

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
  ChevronRight,
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

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#059669", "#d97706", "#7c3aed", "#e11d48"];

export default function DashboardClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");
  const { theme } = useTheme();

  const loadData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Memuat data KasMu...
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {
    profitToday: 0,
    profitMonth: 0,
    countToday: 0,
    cashMutationToday: 0,
  };

  const accounts = data?.accounts || [];
  const totalBalance = data?.totalBalance || 0;
  const latestTxs = data?.latestTransactions || [];
  const chartData = data?.chartData || [];

  const isDark = theme === "dark";

  return (
    <div className="space-y-6">
      <Header onOpenQuickTx={() => setIsModalOpen(true)} />

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Profit Hari Ini */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Profit Hari Ini</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {formatRupiah(kpi.profitToday)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Laba bersih fee toko
          </p>
        </div>

        {/* Card 2: Profit Bulanan */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Profit Bulanan</span>
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {formatRupiah(kpi.profitMonth)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Sudah dikurangi pengeluaran
          </p>
        </div>

        {/* Card 3: Total Transaksi Hari Ini */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Transaksi Hari Ini</span>
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {formatNumber(kpi.countToday)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Total nasabah terlayani
          </p>
        </div>

        {/* Card 4: Keluar/Masuk Cash Hari Ini */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Biaya Operasional</span>
            <ArrowDownUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              kpi.cashMutationToday < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {formatRupiah(kpi.cashMutationToday)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Arus kas laci non-transaksi
          </p>
        </div>
      </div>

      {/* Middle Row: Transaksi Terakhir & Komposisi Saldo Akun */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Transaksi Terakhir */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transaksi Terakhir</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aktivitas layanan perbankan hari ini</p>
            </div>
            <a href="/transaksi" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Lihat Semua
            </a>
          </div>

          <div className="space-y-2">
            {latestTxs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Belum ada transaksi</div>
            ) : (
              latestTxs.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{tx.category.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        ({tx.account?.name || "Provider"})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Nominal: {formatRupiah(tx.amount)}
                      <span className="mx-1">•</span>
                      {new Date(tx.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatRupiah(tx.netProfit)}
                      </div>
                      <span className="inline-block text-[9px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200 dark:border-emerald-900">
                        SUKSES
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedTxForReceipt(tx)}
                      title="Cetak Struk"
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Komposisi Saldo Akun */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Komposisi Saldo Akun</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribusi modal digital & bank</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Modal</span>
              <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatRupiah(totalBalance)}
              </span>
            </div>
          </div>

          <div className="h-44 w-full flex items-center justify-center my-2">
            {accounts.length === 0 ? (
              <p className="text-slate-400 text-xs">Belum ada akun saldo</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accounts}
                    dataKey="balance"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {accounts.map((acc: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={acc.color || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatRupiah(Number(value)), "Saldo"]}
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#cbd5e1",
                      borderRadius: "6px",
                      color: isDark ? "#ffffff" : "#0f172a",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Account Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {accounts.slice(0, 4).map((acc: any, index: number) => (
              <div key={acc.id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: acc.color || PIE_COLORS[index % PIE_COLORS.length] }}
                ></span>
                <span className="text-slate-700 dark:text-slate-300 truncate">{acc.name}</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] ml-auto">
                  {formatRupiah(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Grafik Pertumbuhan Profit */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tren Pertumbuhan Profit</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Grafik laba bersih operasional harian</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setChartView("weekly")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                chartView === "weekly"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setChartView("monthly")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                chartView === "monthly"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              30 Hari
            </button>
          </div>
        </div>

        <div className="h-60 w-full">
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
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={isDark ? "#64748b" : "#94a3b8"}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: any) => [formatRupiah(Number(val)), "Profit"]}
                contentStyle={{
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#cbd5e1",
                  borderRadius: "6px",
                  color: isDark ? "#ffffff" : "#0f172a",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: "#2563eb", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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
