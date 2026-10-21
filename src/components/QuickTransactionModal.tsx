"use client";

import { useState, useEffect } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  Button,
  Input,
  Select,
  Modal,
  Badge,
  Separator,
} from "@/components/ui";

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
  { value: "TOPUP_EWALLET", label: "Topup E-Wallet" },
  { value: "TOKEN_PLN", label: "Token Listrik PLN" },
  { value: "PULSA_DATA", label: "Pulsa & Data" },
  { value: "TAGIHAN_BPJS", label: "Tagihan BPJS" },
  { value: "TAGIHAN_PDAM", label: "Tagihan Air PDAM" },
  { value: "LAINNYA", label: "Lainnya" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash / Tunai" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "QRIS", label: "QRIS" },
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
  }, [isOpen, accountId]);

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

  const handleSubmit = async () => {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Input Transaksi Kasir"
      size="lg"
    >
      {error && (
        <div className="mb-4 p-3 rounded-none bg-rose-900/20 border border-rose-700/50 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Kategori Layanan"
            value={category}
            onValueChange={setCategory}
            options={CATEGORIES}
            required
          />
          <Select
            label="Aplikasi Provider / Rekening"
            value={accountId}
            onValueChange={setAccountId}
            options={accounts.map((acc) => ({
              value: acc.id,
              label: `${acc.name} — Saldo: ${formatRupiah(acc.balance)}`,
            }))}
            placeholder="Pilih provider..."
            required
          />
        </div>

        <div className="bg-[#0a0a0a]/30 border border-slate-700/50 p-4 rounded-none space-y-4">
          <Input
            label="Nominal Transaksi (Rp)"
            value={amount}
            onValueChange={setAmount}
            type="number"
            placeholder="0"
            required
            accounting
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Biaya Admin Bank"
              value={adminBank}
              onValueChange={setAdminBank}
              type="number"
              placeholder="0"
              accounting
            />
            <Input
              label="Fee Toko (Tarif Jasa)"
              value={storeFee}
              onValueChange={setStoreFee}
              type="number"
              placeholder="0"
              accounting
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/30 text-[10px]">
            <span className="text-slate-500">Estimasi Laba Bersih:</span>
            <span className="font-bold font-mono text-emerald-400">
              +{formatRupiah(profit)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Metode Pembayaran"
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            options={PAYMENT_METHODS}
          />
          <Input
            label="Nama Nasabah (Opsional)"
            value={customerName}
            onValueChange={setCustomerName}
            type="text"
            placeholder="Pak Herman"
          />
        </div>

        <Input
          label="No Rekening / No HP / ID Pelanggan"
          value={customerRef}
          onValueChange={setCustomerRef}
          type="text"
          placeholder="Contoh: 00120192847250 / 08123456789"
          className="mb-4"
        />

        <Input
          label="Catatan"
          value={notes}
          onValueChange={setNotes}
          type="text"
          placeholder="Catatan tambahan..."
        />
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          variant="solid"
          onClick={handleSubmit}
          disabled={loading || !accountId || numAmount <= 0}
        >
          {loading ? "Menyimpan..." : "Simpan Transaksi"}
        </Button>
      </div>
    </Modal>
  );
}
