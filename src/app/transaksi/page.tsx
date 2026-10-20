"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal, { CATEGORIES } from "@/components/QuickTransactionModal";
import ReceiptModal from "@/components/ReceiptPrinter";
import { formatRupiah } from "@/lib/utils";
import { Search, Filter, Printer } from "lucide-react";

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("category", selectedCategory);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransactions();
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Riwayat Transaksi"
        subtitle="Data mutasi transaksi nasabah & perbankan"
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between transition-colors">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no struk, nama nasabah, no HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px]">
              <tr>
                <th className="px-4 py-3">No Transaksi / Waktu</th>
                <th className="px-4 py-3">Layanan / Provider</th>
                <th className="px-4 py-3">Nasabah / Referensi</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-right">Fee / Admin</th>
                <th className="px-4 py-3 text-right">Profit Bersih</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Memuat daftar transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Tidak ada transaksi ditemukan
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">{tx.txNumber}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("id-ID")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">
                        {tx.category.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.account?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {tx.customerName || "-"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {tx.customerRef || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <div className="text-amber-700 dark:text-amber-400 font-semibold">{formatRupiah(tx.storeFee)}</div>
                      <div className="text-[10px] text-slate-400">-{formatRupiah(tx.adminBank)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatRupiah(tx.netProfit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTxForReceipt(tx)}
                        title="Cetak Struk Thermal"
                        className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadTransactions}
      />

      <ReceiptModal
        transaction={selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
      />
    </div>
  );
}
