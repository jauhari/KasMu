"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { calculateBankCommission, calculateNetProfit } from "@/lib/accounting";
import { Button, Input, Select, Modal, Separator, DateTimePicker } from "@/components/ui";
import { CATEGORIES } from "@/components/QuickTransactionModal";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash / Tunai" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "QRIS", label: "QRIS" },
];

function toLocalInput(value: string | Date) {
  const d = new Date(value);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  tx: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTransactionModal({
  isOpen,
  tx,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const [category, setCategory] = useState("SETOR_TUNAI");
  const [amount, setAmount] = useState("");
  const [adminBank, setAdminBank] = useState("");
  const [storeFee, setStoreFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [tanggal, setTanggal] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tx) return;
    setCategory(tx.category || "SETOR_TUNAI");
    setAmount(String(tx.amount ?? ""));
    setAdminBank(String(tx.adminBank ?? 0));
    setStoreFee(String(tx.storeFee ?? 0));
    setPaymentMethod(tx.paymentMethod || "CASH");
    setTanggal(toLocalInput(tx.createdAt));
    setCustomerName(tx.customerName || "");
    setCustomerRef(tx.customerRef || "");
    setNotes(tx.notes || "");
    setError(null);
  }, [isOpen, tx]);

  if (!isOpen || !tx) return null;

  const numAmount = parseFloat(amount) || 0;
  const numAdmin = parseFloat(adminBank) || 0;
  const numFee = parseFloat(storeFee) || 0;
  const isHutang = tx.status === "HUTANG";
  const profit = isHutang ? 0 : calculateNetProfit(numFee, numAdmin);
  const commission = calculateBankCommission(numAdmin);
  const moneyLocked = Boolean(tx.bankCommissionRealized);

  const handleSubmit = async () => {
    setError(null);
    if (numAmount <= 0) {
      setError("Nominal transaksi harus lebih dari 0");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: numAmount,
          adminBank: numAdmin,
          storeFee: numFee,
          paymentMethod,
          tanggal,
          customerName,
          customerRef,
          notes,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(json.message || "Transaksi diperbarui");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan perubahan");
      toast.error(err.message || "Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${tx.txNumber}`} size="2xl">
      {error && (
        <div className="mb-3 p-2.5 rounded-none bg-rose-900/20 border border-rose-700/50 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {moneyLocked && (
        <div className="mb-3 p-2.5 border border-amber-700/40 bg-amber-900/10 text-[10px] text-amber-500/90 leading-relaxed flex gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Cashback BRILink transaksi ini sudah dicairkan. Nominal, fee, kategori,
            dan metode dikunci. Nama, nomor referensi, tanggal, dan catatan masih bisa
            diubah.
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Kategori Layanan"
            value={category}
            onValueChange={setCategory}
            options={CATEGORIES}
            required
          />
          <Select
            label="Metode Pembayaran"
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            options={PAYMENT_METHODS}
          />
          <DateTimePicker
            label="Tanggal Transaksi"
            value={tanggal}
            onValueChange={setTanggal}
            required
          />
        </div>

        <div className="bg-[#0b0b0f]/30 border border-slate-700/50 p-3 rounded-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Nominal Transaksi"
              value={amount}
              onValueChange={setAmount}
              type="number"
              accounting
              fontMono
              required
            />
            <Input
              label="Fee BRILink"
              value={adminBank}
              onValueChange={setAdminBank}
              type="number"
              accounting
              fontMono
            />
            <Input
              label="Fee Toko"
              value={storeFee}
              onValueChange={setStoreFee}
              type="number"
              accounting
              fontMono
            />
          </div>
          <div className="pt-2 mt-1 border-t border-slate-700/30 text-[10px] space-y-1">
            <div className="flex items-center justify-end gap-4">
              <span className="text-slate-500">Cashback BRILink (50%):</span>
              <span className="font-bold font-mono text-amber-400">
                +{formatRupiah(commission)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-4">
              <span className="text-slate-500">
                {isHutang ? "Laba diakui saat lunas:" : "Laba bersih:"}
              </span>
              <span className="font-bold font-mono text-emerald-400">
                {formatRupiah(isHutang ? calculateNetProfit(numFee, numAdmin) : profit)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nama Nasabah"
            value={customerName}
            onValueChange={setCustomerName}
            placeholder="Nama pelanggan"
          />
          <Input
            label="No Rekening / No HP / ID Pelanggan"
            value={customerRef}
            onValueChange={setCustomerRef}
            placeholder="Nomor referensi"
            fontMono
          />
        </div>

        <Input
          label="Catatan"
          value={notes}
          onValueChange={setNotes}
          placeholder="Catatan tambahan..."
        />

        {isHutang && (
          <p className="text-[10px] text-amber-500/90 leading-relaxed">
            Transaksi ini berstatus HUTANG. Perubahan nominal ikut menyesuaikan sisa
            piutang nasabah di menu Hutang/Piutang.
          </p>
        )}
      </div>

      <Separator className="my-3" />

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button variant="solid" onClick={handleSubmit} disabled={loading || numAmount <= 0}>
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </Modal>
  );
}
