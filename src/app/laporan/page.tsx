"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { FileText, Download, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function LaporanPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [period]);

  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("KASMU — LAPORAN LABA RUGI OPERASIONAL", 14, 20);
    doc.setFontSize(9);
    doc.text(`Periode: ${period.toUpperCase()} | Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 27);

    const rows = [
      ["Pendapatan Usaha (Fee Toko)", formatRupiah(report.totalFeeToko)],
      ["Potongan Biaya Admin Bank", `(${formatRupiah(report.totalAdminBank)})`],
      ["Pendapatan Lain-lain", formatRupiah(report.otherIncome)],
      ["TOTAL PENDAPATAN BERSIH USAHA", formatRupiah(report.totalPendapatan)],
      ["Beban Operasional Toko", `(${formatRupiah(report.operationalExpenses)})`],
      ["LABA BERSIH OPERASIONAL", formatRupiah(report.labaBersih)],
    ];

    autoTable(doc, {
      startY: 33,
      head: [["Komponen Finansial", "Nilai (Rp)"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Laporan-Keuangan-KasMu-${period}.pdf`);
    toast.success("Laporan PDF berhasil diunduh");
  };

  const exportExcel = () => {
    if (!report) return;
    const worksheetData = [
      ["KASMU — LAPORAN KEUANGAN OPERASIONAL MINI-ATM"],
      ["Periode:", period],
      ["Tanggal Ekspor:", new Date().toLocaleString("id-ID")],
      [],
      ["Komponen", "Nilai (IDR)"],
      ["Pendapatan Usaha (Fee Toko)", report.totalFeeToko],
      ["Potongan Admin Bank", -report.totalAdminBank],
      ["Pendapatan Lain-lain", report.otherIncome],
      ["Total Pendapatan", report.totalPendapatan],
      ["Beban Operasional", -report.operationalExpenses],
      ["LABA BERSIH", report.labaBersih],
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laba Rugi");
    XLSX.writeFile(wb, `Laporan-Keuangan-KasMu-${period}.xlsx`);
    toast.success("Laporan Excel berhasil diunduh");
  };

  const r = report || {
    totalFeeToko: 0,
    totalAdminBank: 0,
    otherIncome: 0,
    totalPendapatan: 0,
    operationalExpenses: 0,
    labaBersih: 0,
    txCount: 0,
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Laporan Keuangan"
        subtitle="Laba rugi & profitabilitas operasional toko"
      />

      {/* Top Filter and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="today">Hari Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ekspor PDF</span>
          </button>
          <button
            onClick={exportExcel}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Laba Bersih Highlight Card */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            Laba Bersih Periode Ini
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(r.labaBersih)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fee Toko + Pendapatan Lain − Beban Operasional
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="block text-[10px] text-slate-400">vs Hari Lalu</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +5.7%
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400">vs Bulan Lalu</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +12.4%
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Laporan Laba Rugi */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Rincian Laporan Laba Rugi
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="font-medium text-slate-800 dark:text-slate-200">Pendapatan Usaha (Fee Toko)</span>
              <div className="text-[10px] text-slate-500">
                Biaya admin bank: ({formatRupiah(r.totalAdminBank)})
              </div>
            </div>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {formatRupiah(r.totalFeeToko)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <span className="font-medium text-slate-800 dark:text-slate-200">Pendapatan Lain-lain</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{formatRupiah(r.otherIncome)}</span>
          </div>

          <div className="flex justify-between py-2 font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/60 px-3 rounded-lg">
            <span>Total Pendapatan</span>
            <span className="font-mono">{formatRupiah(r.totalPendapatan)}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-rose-600 dark:text-rose-400">
            <span className="font-medium">Beban Operasional Toko</span>
            <span className="font-mono font-semibold">({formatRupiah(r.operationalExpenses)})</span>
          </div>

          <div className="flex justify-between py-3 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-bold text-sm">
            <span className="text-slate-900 dark:text-white">LABA BERSIH OPERASIONAL</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(r.labaBersih)}</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-500">Transaksi Sukses</span>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">{r.txCount}</div>
        </div>
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-500">Rata-rata Pendapatan</span>
          <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {formatRupiah(r.txCount > 0 ? r.totalPendapatan / r.txCount : 0)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-500">Total Pendapatan</span>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {formatRupiah(r.totalPendapatan)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-500">Beban Operasional</span>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {formatRupiah(r.operationalExpenses)}
          </div>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadReport}
      />
    </div>
  );
}
