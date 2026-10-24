"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input, Button } from "@/components/ui";

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

  const handleCreate = async () => {
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
          <h3 className="text-sm font-bold text-white">Daftar Hutang / Piutang</h3>
          <p className="text-xs text-slate-500">Monitoring kasbon talangan nasabah counter</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="solid" size="sm">
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Catatan</span>
        </Button>
      </div>

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#15151a] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700 text-[10px]">
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
          <tbody className="divide-y divide-slate-800/50 text-slate-400">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-600">Memuat catatan...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-600">Belum ada catatan hutang / piutang</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-[#15151a]/50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-1.5 py-0.5 rounded-none text-[9px] font-semibold border ${
                        r.type === "PIUTANG"
                          ? "border-rose-700/50 bg-rose-900/20 text-rose-400"
                          : "border-amber-700/50 bg-amber-900/20 text-amber-400"
                      }`}
                    >
                      {r.type === "PIUTANG" ? "PIUTANG (KASBON)" : "HUTANG TOKO"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{r.partyName}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{r.phone || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-white">
                    {formatRupiah(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                    {formatRupiah(r.remaining)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded-none text-[9px] font-semibold border ${
                        r.status === "PAID"
                          ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-400"
                          : "border-amber-700/50 bg-amber-900/20 text-amber-400"
                      }`}
                    >
                      {r.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status !== "PAID" && (
                      <button
                        onClick={() => handlePay(r.id, r.remaining)}
                        className="px-2 py-1 rounded-none bg-blue-900/20 hover:bg-blue-600 hover:text-white text-blue-500 font-semibold text-[10px] transition-colors border border-blue-700/50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-sm p-5 text-white shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-tighter text-[10px] letter-spacing-[0.05em]">
              Tambah Catatan Hutang / Piutang
            </h3>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("PIUTANG")}
                  className={`py-1.5 rounded-none font-medium border text-xs transition-all ${
                    type === "PIUTANG"
                      ? "border-rose-600 bg-rose-900/20 text-rose-400 font-bold"
                      : "border-slate-700 bg-transparent text-slate-500"
                  }`}
                >
                  Piutang (Kasbon Nasabah)
                </button>
                <button
                  type="button"
                  onClick={() => setType("HUTANG")}
                  className={`py-1.5 rounded-none font-medium border text-xs transition-all ${
                    type === "HUTANG"
                      ? "border-amber-600 bg-amber-900/20 text-amber-400 font-bold"
                      : "border-slate-700 bg-transparent text-slate-500"
                  }`}
                >
                  Hutang Toko
                </button>
              </div>

              <Input
                label="Nama Pihak / Nasabah"
                value={partyName}
                onValueChange={setPartyName}
                placeholder="Contoh: Pak Joko"
                required
              />

              <Input
                label="No HP / WhatsApp"
                value={phone}
                onValueChange={setPhone}
                placeholder="Contoh: 08123456789"
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
        onSuccess={loadRecords}
      />
    </div>
  );
}
