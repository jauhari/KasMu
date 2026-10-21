"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import ReceiptModal from "@/components/ReceiptPrinter";
import { formatRupiah } from "@/lib/utils";
import { Search, Filter, Printer } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";

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

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Riwayat Transaksi"
        subtitle="Data mutasi transaksi nasabah & perbankan"
      />

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Cari no struk, nama nasabah, no HP..."
            className="w-full pl-9 pr-10"
          />
          <button
            onClick={() => loadTransactions()}
            className="absolute right-2 top-2 text-slate-500 hover:text-white"
          >
            🔍
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              options={[
                { value: "", label: "Semua Kategori" },
                ...Object.entries(CATEGORIES_MAP).map(([value, label]) => ({ value, label })),
              ]}
              placeholder="Kategori"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-[#15151a] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700 text-[10px]">
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
            <tbody className="divide-y divide-slate-800/50 text-slate-400">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-600">
                    Memuat daftar transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-600">
                    Tidak ada transaksi ditemukan
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#15151a]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-200 text-[11px]">{tx.txNumber}</div>
                      <div className="text-[10px] text-slate-600">
                        {new Date(tx.createdAt).toLocaleString("id-ID")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        {tx.category.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">{tx.account?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{tx.customerName || "-"}</div>
                      <div className="text-[10px] text-slate-600 font-mono">{tx.customerRef || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-white">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <div className="text-amber-500 font-semibold">{formatRupiah(tx.storeFee)}</div>
                      <div className="text-[10px] text-slate-600">-{formatRupiah(tx.adminBank)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-emerald-400">
                      +{formatRupiah(tx.netProfit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded-none text-[9px] font-semibold border border-emerald-700/50 bg-emerald-900/20 text-emerald-400">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTxForReceipt(tx)}
                        title="Cetak Struk Thermal"
                        className="p-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
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

const CATEGORIES_MAP: Record<string, string> = {
  SETOR_TUNAI: "Setor Tunai",
  TARIK_TUNAI: "Tarik Tunai",
  TRANSFER_BANK: "Transfer Antar Bank",
  TOPUP_EWALLET: "Topup E-Wallet",
  TOKEN_PLN: "Token Listrik PLN",
  PULSA_DATA: "Pulsa & Data",
  TAGIHAN_BPJS: "Tagihan BPJS",
  TAGIHAN_PDAM: "Tagihan Air PDAM",
  LAINNYA: "Lainnya",
};
