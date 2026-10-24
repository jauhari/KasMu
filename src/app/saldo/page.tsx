"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { Wallet, Plus, AlertCircle, ArrowLeftRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input, Select, Button } from "@/components/ui";

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

  // Koreksi saldo
  const [editAcc, setEditAcc] = useState<any>(null);
  const [editBalance, setEditBalance] = useState("");
  const [editNote, setEditNote] = useState("");

  // Transfer antar akun
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tNote, setTNote] = useState("");
  const [tBusy, setTBusy] = useState(false);

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

  const handleCreate = async () => {
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

  const openEdit = (acc: any) => {
    setEditAcc(acc);
    setEditBalance(String(acc.balance));
    setEditNote("");
  };

  const handleEdit = async () => {
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editAcc.id,
          balance: parseFloat(editBalance.replace(/[^0-9.-]/g, "")) || 0,
          balanceNote: editNote || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Saldo berhasil dikoreksi");
      setEditAcc(null);
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengoreksi saldo");
    }
  };

  const handleTransfer = async () => {
    if (!tFrom || !tTo) {
      toast.error("Pilih akun asal dan tujuan");
      return;
    }
    const amt = parseFloat(tAmount.replace(/[^0-9]/g, "")) || 0;
    if (amt <= 0) {
      toast.error("Nominal transfer harus lebih dari 0");
      return;
    }
    setTBusy(true);
    try {
      const res = await fetch("/api/accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId: tFrom, toAccountId: tTo, amount: amt, note: tNote || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(json.message || "Transfer berhasil");
      setShowTransferModal(false);
      setTFrom("");
      setTTo("");
      setTAmount("");
      setTNote("");
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Gagal transfer");
    } finally {
      setTBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Saldo Provider & Rekening"
        subtitle="Kelola saldo digital modal operasional mini-ATM"
      />

      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white">Daftar Akun Provider</h3>
          <p className="text-xs text-slate-500">Monitoring saldo modal digital sebelum melayani nasabah</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-amber-700/60 text-amber-500 hover:bg-amber-600/10 active:bg-amber-600/20 font-semibold text-xs transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer Antar Akun</span>
          </button>
          <Button onClick={() => setShowAddModal(true)} variant="solid" size="sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Akun</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-slate-600 text-xs">Memuat akun...</div>
        ) : (
          accounts.map((acc) => (
            <div key={acc.id} className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-none flex items-center justify-center text-white font-bold text-xs shrink-0 border border-slate-700"
                    style={{ backgroundColor: acc.color || "#2563eb" }}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">{acc.name}</h4>
                    <p className="text-[10px] text-slate-600 font-mono">
                      {acc.accountNumber || "Tanpa Rekening"}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-none border border-slate-700 text-slate-500">
                  {acc.type}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <span className="text-[10px] uppercase tracking-wider text-slate-600 block">
                  SALDO TERSEDIA
                </span>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold font-mono text-white">
                    {formatRupiah(acc.balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(acc)}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-slate-300 hover:text-amber-500 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Koreksi
                  </button>
                </div>
              </div>

              {acc.balance < 1000000 && (
                <div className="flex items-center gap-1.5 p-2 rounded-none bg-rose-900/20 border border-rose-700/50 text-rose-400 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Saldo menipis, segera topup</span>
                </div>
              )}
            </div>
        ))
      )}
    </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-sm p-5 text-white shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-tighter text-[10px] letter-spacing-[0.05em]">
              Tambah Akun Provider
            </h3>
            <div className="space-y-4 text-xs">
              <Input
                label="Nama Provider / Akun"
                value={name}
                onValueChange={setName}
                placeholder="Contoh: Livin Mandiri Kasir 2"
                required
              />

              <Input
                label="No Rekening / No HP"
                value={accountNumber}
                onValueChange={setAccountNumber}
                placeholder="Contoh: 1370012984712"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="km-label">Tipe</label>
                  <Select
                    value={type}
                    onValueChange={setType}
                    options={[
                      { value: "BANK", label: "Bank Digital" },
                      { value: "EWALLET", label: "E-Wallet" },
                      { value: "CASH_DRAWER", label: "Laci Kasir" },
                    ]}
                  />
                </div>
                <div>
                <Input
                  label="Saldo Awal (Rp)"
                  value={balance}
                  onValueChange={setBalance}
                  type="number"
                  placeholder="0"
                  required
                  accounting
                />
                </div>
              </div>

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

      {editAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-sm p-5 text-white shadow-xl space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.05em] font-bold">
              Koreksi Saldo — {editAcc.name}
            </h3>
            {editAcc.type === "CASH_DRAWER" && (
              <p className="text-[10px] text-amber-500/90 leading-relaxed">
                Akun ini Laci Kasir — selisih akan otomatis tercatat di Mutasi Kas
                ("Penyesuaian Saldo") agar opname tetap cocok.
              </p>
            )}
            <div className="space-y-4 text-xs">
              <Input
                label="Saldo Baru (Rp)"
                value={editBalance}
                onValueChange={setEditBalance}
                type="number"
                accounting
                required
              />
              {/* Koreksi otomatis: langsung dihitung dari saldo tercatat */}
              {(() => {
                const newVal = parseFloat(editBalance.replace(/[^0-9.-]/g, "")) || 0;
                const diff = Math.round((newVal - (editAcc.balance || 0)) * 100) / 100;
                if (editBalance === "" || diff === 0) {
                  return (
                    <p className="text-[11px] font-mono text-slate-500">
                      Koreksi: tidak ada perubahan (saldo tercatat {formatRupiah(editAcc.balance || 0)})
                    </p>
                  );
                }
                const plus = diff > 0;
                return (
                  <p
                    className={`text-[11px] font-mono font-semibold ${
                      plus ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    Koreksi: {plus ? "+" : "-"}
                    {formatRupiah(Math.abs(diff))} {plus ? "(kelebihan masuk)" : "(kurang keluar)"} — dari{" "}
                    {formatRupiah(editAcc.balance || 0)} menjadi {formatRupiah(newVal)}
                  </p>
                );
              })()}
              <Input label="Catatan" value={editNote} onValueChange={setEditNote} placeholder="Alasan koreksi (opsional)" />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditAcc(null)}
                  className="px-3.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-4 py-1.5 rounded-none bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-amber-600/20"
                >
                  Simpan Koreksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-sm p-5 text-white shadow-xl space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.05em] font-bold">
              Transfer Antar Akun
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Transfer yang melibatkan Laci Kasir otomatis tercatat di Mutasi Kas.
              Transfer antar akun digital langsung memindahkan modal, tanpa memicu omzet.
            </p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="km-label">Dari Akun</label>
                <Select
                  value={tFrom}
                  onValueChange={setTFrom}
                  options={[
                    { value: "", label: "Pilih akun asal" },
                    ...accounts.map((a) => ({
                      value: a.id,
                      label: `${a.name} (${a.type === "CASH_DRAWER" ? "Laci Kasir" : formatRupiah(a.balance)})`,
                    })),
                  ]}
                />
              </div>
              <div>
                <label className="km-label">Ke Akun</label>
                <Select
                  value={tTo}
                  onValueChange={setTTo}
                  options={[
                    { value: "", label: "Pilih akun tujuan" },
                    ...accounts
                      .filter((a) => a.id !== tFrom || !tFrom)
                      .map((a) => ({
                        value: a.id,
                        label: `${a.name} (${a.type === "CASH_DRAWER" ? "Laci Kasir" : formatRupiah(a.balance)})`,
                      })),
                  ]}
                />
              </div>
              <Input
                label="Nominal (Rp)"
                value={tAmount}
                onValueChange={setTAmount}
                type="number"
                accounting
                placeholder="0"
                required
              />
              <Input label="Catatan" value={tNote} onValueChange={setTNote} placeholder="Alasan transfer (opsional)" />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={tBusy}
                  onClick={handleTransfer}
                  className="px-4 py-1.5 rounded-none bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-amber-600/20 disabled:opacity-50"
                >
                  {tBusy ? "Memproses..." : "Transfer"}
                </button>
              </div>
            </div>
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
