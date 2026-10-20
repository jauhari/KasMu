"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function HutangPiutangPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<"PIUTANG" | "HUTANG">("PIUTANG");
  const [partyName, setPartyName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const loadRecords = async () => {
    try {
      const res = await fetch("/api/debt-loans");
      const json = await res.json();
      if (json.success) setRecords(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/debt-loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          partyName,
          phone,
          amount: parseFloat(amount) || 0,
          notes,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Catatan berhasil dibuat");
      setShowAddModal(false);
      setPartyName("");
      setPhone("");
      setAmount("");
      setNotes("");
      loadRecords();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  const handlePay = async (id: string, currentRemaining: number) => {
    const payStr = prompt(`Masukkan jumlah pelunasan (Sisa: ${formatRupiah(currentRemaining)}):`, currentRemaining.toString());
    if (!payStr) return;
    const pay = parseFloat(payStr);
    if (!pay || pay <= 0) return;

    try {
      const res = await fetch("/api/debt-loans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, paymentAmount: pay }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Pelunasan berhasil dicatat");
      loadRecords();
    } catch (err: any) {
      toast.error(err.message || "Gagal melunasi");
    }
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Hutang & Piutang Nasabah"
        subtitle="Pantau kasbon talangan nasabah dan jatuh tempo"
      />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Hutang / Piutang</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Monitoring kasbon talangan nasabah counter</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Catatan</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px]">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Nama Pihak / No HP</th>
              <th className="px-4 py-3 text-right">Total Pinjaman</th>
              <th className="px-4 py-3 text-right">Sisa Tagihan</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">Memuat catatan...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">Belum ada catatan hutang / piutang</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                        r.type === "PIUTANG"
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                      }`}
                    >
                      {r.type === "PIUTANG" ? "PIUTANG (KASBON)" : "HUTANG TOKO"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{r.partyName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{r.phone || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                    {formatRupiah(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatRupiah(r.remaining)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                        r.status === "PAID"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                      }`}
                    >
                      {r.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status !== "PAID" && (
                      <button
                        onClick={() => handlePay(r.id, r.remaining)}
                        className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-400 font-semibold text-[10px] transition-colors border border-blue-200 dark:border-blue-900"
                      >
                        Lunasi
                      </button>
                    )}
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Catatan Hutang / Piutang</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("PIUTANG")}
                  className={`py-1.5 rounded-lg font-medium border text-xs transition-all ${
                    type === "PIUTANG"
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Piutang (Kasbon Nasabah)
                </button>
                <button
                  type="button"
                  onClick={() => setType("HUTANG")}
                  className={`py-1.5 rounded-lg font-medium border text-xs transition-all ${
                    type === "HUTANG"
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Hutang Toko
                </button>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Nama Pihak / Nasabah</label>
                <input
                  type="text"
                  placeholder="Contoh: Pak Joko"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">No HP / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono text-slate-900 dark:text-white focus:outline-none"
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
        onSuccess={loadRecords}
      />
    </div>
  );
}
