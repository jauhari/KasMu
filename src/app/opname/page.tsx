"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah, formatNumber } from "@/lib/utils";
import {
  Calculator,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Input, Button } from "@/components/ui";

const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];

export default function OpnamePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sheetCounts, setSheetCounts] = useState<Record<number, string>>({
    100000: "0",
    50000: "0",
    20000: "0",
    10000: "0",
    5000: "0",
    2000: "0",
    1000: "0",
    500: "0",
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadOpnameData = async () => {
    try {
      const res = await fetch("/api/opname");
      const json = await res.json();
      if (json.success && json.hasActiveShift) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpnameData();
  }, []);

  const handleSheetChange = (denom: number, value: string) => {
    setSheetCounts((prev) => ({ ...prev, [denom]: value }));
  };

  const totalUangFisik = DENOMINATIONS.reduce((sum, denom) => {
    const count = parseInt(sheetCounts[denom]) || 0;
    return sum + denom * count;
  }, 0);

  const targetCashFisik = data?.targetPhysicalCash || 0;
  const selisih = totalUangFisik - targetCashFisik;

  const handleSubmitReconciliation = async (closeShift: boolean = false) => {
    if (!data?.shiftId) {
      toast.error("Tidak ada shift aktif");
      return;
    }

    setSubmitting(true);
    try {
      const sheets = DENOMINATIONS.map((d) => ({
        denomination: d,
        sheetCount: parseInt(sheetCounts[d]) || 0,
      }));

      const res = await fetch("/api/opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: data.shiftId,
          sheets,
          notes,
          closeShift,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast.success(json.message);
      loadOpnameData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan opname kas");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 text-xs">
        Memuat kalkulator opname kas...
      </div>
    );
  }

  const pnl = data?.pnl || {
    totalFeeToko: 0,
    totalAdminBank: 0,
    otherIncome: 0,
    operationalExpenses: 0,
    netProfitShift: 0,
  };

  const accounts = data?.accounts || [];

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Opname Cash & Rekonsiliasi"
        subtitle="Sesuaikan fisik uang laci dengan catatan sistem"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div>
              <h3 className="font-bold text-white text-sm">Target Saldo & Brankas</h3>
              <p className="text-xs text-slate-500">Kasir: {data?.kasirName || "Owner"}</p>
            </div>
            <Calculator className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-600">Modal Awal Brankas:</span>
              <span className="font-bold font-mono text-white">{formatRupiah(data?.initialCash || 0)}</span>
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                Saldo Provider Berjalan:
              </span>
              {accounts.map((acc: any) => (
                <div key={acc.id} className="flex justify-between pl-2 text-xs text-slate-500">
                  <span>~ {acc.name}</span>
                  <span className="font-mono text-slate-300">{formatRupiah(acc.balance)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between py-1 border-t border-slate-700/50">
              <span className="text-slate-600">Total Hutang:</span>
              <span className="font-mono font-medium text-amber-500">+{formatRupiah(data?.totalHutang || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-600">Total Piutang (Kasbon Nasabah):</span>
              <span className="font-mono font-medium text-rose-500">-{formatRupiah(data?.totalPiutang || 0)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#0a0a0a]/50 border border-slate-700/50 rounded-none flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                Target Cash Fisik Laci
              </div>
              <div className="text-[11px] text-slate-600">Uang tunai wajib ada di laci</div>
            </div>
            <div className="text-xl font-bold font-mono text-blue-500">
              {formatRupiah(targetCashFisik)}
            </div>
          </div>
        </div>

        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div>
              <h3 className="font-bold text-white text-sm">P&L (Shift Berjalan)</h3>
              <p className="text-xs text-slate-500">Pendapatan fee jasa vs biaya operasional</p>
            </div>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-600">Total Fee Toko (Jasa):</span>
              <span className="font-bold font-mono text-emerald-500">+{formatRupiah(pnl.totalFeeToko)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-600">Biaya Admin Bank:</span>
              <span className="font-bold font-mono text-rose-500">-{formatRupiah(pnl.totalAdminBank)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-600">Pemasukan Lain:</span>
              <span className="font-mono text-emerald-500">+{formatRupiah(pnl.otherIncome)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-600">Beban Operasional:</span>
              <span className="font-mono text-rose-500">-{formatRupiah(pnl.operationalExpenses)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#0a0a0a]/50 border border-slate-700/50 rounded-none flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Profit / Defisit Shift:
            </div>
            <div
              className={`text-xl font-bold font-mono ${
                pnl.netProfitShift >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {pnl.netProfitShift >= 0 ? "+" : ""}
              {formatRupiah(pnl.netProfitShift)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-sm space-y-5 transition-colors">
        <div className="pb-3 border-b border-slate-700">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            Kalkulator Uang Fisik (Pecahan Lembar)
          </h3>
          <p className="text-xs text-slate-500">
            Hitung uang riil per pecahan lembar di laci kasir untuk rekonsiliasi
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DENOMINATIONS.map((denom) => {
            const count = parseInt(sheetCounts[denom]) || 0;
            const subtotal = denom * count;
            return (
              <div
                key={denom}
                className="bg-[#0a0a0a]/30 border border-slate-700/50 p-3 rounded-none space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">{formatRupiah(denom)}</span>
                  <span className="text-[10px] text-slate-600 font-mono">={formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={sheetCounts[denom]}
                    onValueChange={(v) => handleSheetChange(denom, v)}
                    type="number"
                    placeholder="0"
                    className="w-20 text-center"
                  />
                  <span className="text-xs text-slate-600 shrink-0">lbr</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-[#0a0a0a]/30 border border-slate-700/50 rounded-none flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-600 uppercase tracking-wide">
              Total Fisik Dihitung Kasir
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatRupiah(totalUangFisik)}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#050507] px-4 py-2.5 rounded-none border border-slate-700">
            <div>
              <div className="text-[10px] text-slate-600 uppercase">Selisih dengan Target:</div>
              <div
                className={`text-lg font-bold font-mono ${
                  selisih === 0
                    ? "text-emerald-500"
                    : selisih > 0
                    ? "text-blue-500"
                    : "text-rose-500"
                }`}
              >
                {selisih > 0 ? `+${formatRupiah(selisih)}` : formatRupiah(selisih)}
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-none text-[11px] font-semibold border ${
                selisih === 0
                  ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-400"
                  : selisih > 0
                  ? "border-blue-700/50 bg-blue-900/20 text-blue-400"
                  : "border-rose-700/50 bg-rose-900/20 text-rose-400"
              }`}
            >
              {selisih === 0 ? "COCOK / BALANCE" : selisih > 0 ? "LEBIH / SURPLUS" : "SELISIH KURANG"}
            </span>
          </div>
        </div>

        <div>
          <label className="km-label">Catatan Rekonsiliasi (Opsional)</label>
          <Input
            value={notes}
            onValueChange={setNotes}
            placeholder="Contoh: Kembalian pelanggan kurang Rp500, koin receh tertinggal di laci"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-700/50">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitReconciliation(false)}
            className="px-4 py-2 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Opname</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (confirm("Apakah Anda yakin ingin menyelesaikan dan menutup shift kasir saat ini?")) {
                handleSubmitReconciliation(true);
              }
            }}
            className="px-5 py-2 rounded-none bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-amber-600/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tutup Shift & Kunci Kas</span>
          </button>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadOpnameData}
      />
    </div>
  );
}
