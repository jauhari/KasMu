"use client";

import { useState, useEffect } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CATEGORIES = [
  { value: "SETOR_TUNAI", label: "Setor Tunai" },
  { value: "TARIK_TUNAI", label: "Tarik Tunai" },
  { value: "TRANSFER_BANK", label: "Transfer Antar Bank" },
  { value: "TOPUP_EWALLET", label: "Topup E-Wallet (Dana, Ovo, Gopay)" },
  { value: "TOKEN_PLN", label: "Token Listrik PLN" },
  { value: "PULSA_DATA", label: "Pulsa & Paket Data" },
  { value: "TAGIHAN_BPJS", label: "Tagihan BPJS Kesehatan" },
  { value: "TAGIHAN_PDAM", label: "Tagihan Air PDAM" },
  { value: "LAINNYA", label: "Transaksi Lainnya" },
];

export default function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickTransactionModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("SETOR_TUNAI");
  const [amount, setAmount] = useState("");
  const [adminBank, setAdminBank] = useState("2500");
  const [storeFee, setStoreFee] = useState("10000");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category === "SETOR_TUNAI") {
      setAdminBank("2500");
      setStoreFee("10000");
    } else if (category === "TARIK_TUNAI") {
      setAdminBank("0");
      setStoreFee("5000");
    } else if (category === "TOPUP_EWALLET") {
      setAdminBank("500");
      setStoreFee("3000");
    } else if (category === "TOKEN_PLN" || category === "PULSA_DATA") {
      setAdminBank("1000");
      setStoreFee("3000");
    }
  }, [category]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setAccounts(data.data);
          if (!accountId) {
            setAccountId(data.data[0].id);
          }
        }
      })
      .catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const numAdmin = parseFloat(adminBank) || 0;
  const numFee = parseFloat(storeFee) || 0;
  const profit = numFee - numAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accountId || numAmount <= 0) {
      setError("Silakan pilih akun provider dan isi nominal transaksi");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          category,
          amount: numAmount,
          adminBank: numAdmin,
          storeFee: numFee,
          paymentMethod,
          customerName,
          customerRef,
          notes,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan transaksi");
      }

      onSuccess();
      onClose();
      setAmount("");
      setCustomerName("");
      setCustomerRef("");
      setNotes("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl shadow-xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Input Transaksi Kasir (F2)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Catat transaksi perbankan & digital agen dalam 3 detik
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Kategori */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Layanan
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Aplikasi Provider / Rekening
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — Saldo: {formatRupiah(acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nominal */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nominal Transaksi (Rp)
              </label>
              <input
                type="number"
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 font-mono text-lg font-bold text-slate-900 dark:text-emerald-400 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Biaya Admin Bank
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={adminBank}
                  onChange={(e) => setAdminBank(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Fee Toko (Tarif Jasa Agen)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={storeFee}
                  onChange={(e) => setStoreFee(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Estimasi Laba Bersih Transaksi:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                +{formatRupiah(profit)}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="CASH">Cash / Uang Tunai</option>
                <option value="TRANSFER">Transfer</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nama Nasabah (Opsional)
              </label>
              <input
                type="text"
                placeholder="Pak Herman"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              No Rekening / No HP / ID Pelanggan
            </label>
            <input
              type="text"
              placeholder="Contoh: 00120192847250 / 08123456789"
              value={customerRef}
              onChange={(e) => setCustomerRef(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              {loading ? (
                "Menyimpan..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
