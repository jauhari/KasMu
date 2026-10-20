"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";

export default function MutasiKasPage() {
  const [mutations, setMutations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<"OUT" | "IN">("OUT");
  const [category, setCategory] = useState("Makan Kasir & Minum");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const loadMutations = async () => {
    try {
      const res = await fetch("/api/cash-mutations");
      const json = await res.json();
      if (json.success) setMutations(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMutations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/cash-mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          amount: parseFloat(amount) || 0,
          notes,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(json.message);
      setShowAddModal(false);
      setAmount("");
      setNotes("");
      loadMutations();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat mutasi kas");
    }
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Biaya Operasional & Kas Masuk"
        subtitle="Catat pengeluaran toko dan mutasi kas di luar transaksi perbankan"
      />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat Mutasi Operasional</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pengeluaran kasir otomatis memotong target uang fisik laci</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Biaya</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px]">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">Memuat mutasi...</td>
              </tr>
            ) : mutations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">Belum ada catatan mutasi</td>
              </tr>
            ) : (
              mutations.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(m.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                        m.type === "IN"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      {m.type === "IN" ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3" /> MASUK
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3" /> KELUAR
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">{m.category}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{m.notes || "-"}</td>
                  <td
                    className={`px-4 py-3 text-right font-bold font-mono ${
                      m.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {m.type === "IN" ? "+" : "-"}
                    {formatRupiah(m.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-sm p-5 text-slate-900 dark:text-slate-100 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Catat Biaya / Kas Masuk</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("OUT")}
                  className={`py-1.5 rounded-lg font-medium border text-xs transition-all ${
                    type === "OUT"
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Pengeluaran Toko
                </button>
                <button
                  type="button"
                  onClick={() => setType("IN")}
                  className={`py-1.5 rounded-lg font-medium border text-xs transition-all ${
                    type === "IN"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Pemasukan Lain
                </button>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Kategori</label>
                <input
                  type="text"
                  placeholder="Contoh: Kertas Struk Thermal / Makan Kasir"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Keterangan Tambahan</label>
                <input
                  type="text"
                  placeholder="Contoh: Beli 5 rol struk thermal"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                />
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
        onSuccess={loadMutations}
      />
    </div>
  );
}
