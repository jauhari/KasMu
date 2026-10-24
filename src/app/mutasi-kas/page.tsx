"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { Input, Button } from "@/components/ui";

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

  const handleCreate = async () => {
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
          <h3 className="text-sm font-bold text-white">Riwayat Mutasi Operasional</h3>
          <p className="text-xs text-slate-500">Pengeluaran kasir otomatis memotong target uang fisik laci</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="solid" size="sm">
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Biaya</span>
        </Button>
      </div>

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#15151a] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700 text-[10px]">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-400">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-600">Memuat mutasi...</td>
              </tr>
            ) : mutations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-600">Belum ada catatan mutasi</td>
              </tr>
            ) : (
              mutations.map((m) => (
                <tr key={m.id} className="hover:bg-[#15151a]/50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(m.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-semibold border ${
                        m.type === "IN"
                          ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-400"
                          : "border-rose-700/50 bg-rose-900/20 text-rose-400"
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
                  <td className="px-4 py-3 font-semibold text-white">{m.category}</td>
                  <td className="px-4 py-3 text-slate-600">{m.notes || "-"}</td>
                  <td
                    className={`px-4 py-3 text-right font-bold font-mono ${
                      m.type === "IN" ? "text-emerald-400" : "text-rose-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-sm p-5 text-white shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-tighter text-[10px] letter-spacing-[0.05em]">
              Catat Biaya / Kas Masuk
            </h3>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("OUT")}
                  className={`py-1.5 rounded-none font-medium border text-xs transition-all ${
                    type === "OUT"
                      ? "border-rose-600 bg-rose-900/20 text-rose-400 font-bold"
                      : "border-slate-700 bg-transparent text-slate-500"
                  }`}
                >
                  Pengeluaran Toko
                </button>
                <button
                  type="button"
                  onClick={() => setType("IN")}
                  className={`py-1.5 rounded-none font-medium border text-xs transition-all ${
                    type === "IN"
                      ? "border-emerald-600 bg-emerald-900/20 text-emerald-400 font-bold"
                      : "border-slate-700 bg-transparent text-slate-500"
                  }`}
                >
                  Pemasukan Lain
                </button>
              </div>

              <Input
                label="Kategori"
                value={category}
                onValueChange={setCategory}
                placeholder="Contoh: Kertas Struk Thermal / Makan Kasir"
                required
              />

              <Input
                label="Nominal (Rp)"
                value={amount}
                onValueChange={setAmount}
                type="number"
                placeholder="0"
                required
                accounting
              />

              <Input
                label="Keterangan Tambahan"
                value={notes}
                onValueChange={setNotes}
                placeholder="Contoh: Beli 5 rol struk thermal"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-4 py-1.5 rounded-none bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-amber-600/20"
                >
                  Simpan
                </button>
              </div>
            </div>
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
