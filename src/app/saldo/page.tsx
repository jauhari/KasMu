"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { Wallet, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SaldoPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [type, setType] = useState("BANK");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState("#2563eb");

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (json.success) setAccounts(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          accountNumber,
          type,
          balance: parseFloat(balance) || 0,
          color,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Akun provider baru berhasil ditambahkan!");
      setShowAddModal(false);
      setName("");
      setAccountNumber("");
      setBalance("");
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat akun");
    }
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Saldo Provider & Rekening"
        subtitle="Kelola saldo digital modal operasional mini-ATM"
      />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Akun Provider</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Monitoring saldo modal digital sebelum melayani nasabah</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-slate-400 text-xs">Memuat akun...</div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: acc.color || "#2563eb" }}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">{acc.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {acc.accountNumber || "Tanpa Rekening"}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {acc.type}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  SALDO TERSEDIA
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {formatRupiah(acc.balance)}
                </span>
              </div>

              {acc.balance < 1000000 && (
                <div className="flex items-center gap-1.5 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Saldo menipis, segera topup</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-sm p-5 text-slate-900 dark:text-slate-100 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Akun Provider</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Nama Provider / Akun</label>
                <input
                  type="text"
                  placeholder="Contoh: Livin Mandiri Kasir 2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">No Rekening / No HP</label>
                <input
                  type="text"
                  placeholder="Contoh: 1370012984712"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Tipe</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="BANK">Bank Digital</option>
                    <option value="EWALLET">E-Wallet</option>
                    <option value="CASH_DRAWER">Laci Kasir</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Saldo Awal (Rp)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAccounts}
      />
    </div>
  );
}
