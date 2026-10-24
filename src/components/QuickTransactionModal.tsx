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
  DateTimePicker,
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
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [tanggal, setTanggal] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [totalCollected, setTotalCollected] = useState(""); // total yg ditagih ke pelanggan
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [nameTouched, setNameTouched] = useState(false);

  // Waktu lokal format "YYYY-MM-DDTHH:mm" untuk <input type="datetime-local">
  const nowLocalInput = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  };

  // Setiap kali modal dibuka, tanggal default = sekarang
  useEffect(() => {
    if (isOpen) setTanggal(nowLocalInput());
  }, [isOpen]);

  const numAmount = parseFloat(amount) || 0;
  const numAdmin = parseFloat(adminBank) || 0;
  const numFee = parseFloat(storeFee) || 0;
  const profit = numFee - numAdmin;

  // ===== FEE OTOMATIS: isi "Total Diterima dari Pelanggan" → Fee Toko =
  // total − nominal transaksi − admin bank. Nikah sekalian saat
  // nominal/admin ikut diubah, jadi tidak perlu pakai kalkulator manual.
  useEffect(() => {
    const target = parseFloat(totalCollected) || 0;
    if (target > 0 && numAmount > 0) {
      const fee = Math.max(0, Math.round(target - numAmount - numAdmin));
      setStoreFee(String(fee));
    }
  }, [totalCollected, numAmount, numAdmin]);

  // Daftar kontak utk autocomplete — sekalian acuan "sudah terdaftar / belum"
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCustomerNames(data.data.map((c: { name: string }) => c.name));
        }
      })
      .catch(console.error);
  }, [isOpen]);

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

  const handleSubmit = async () => {
    setError(null);
    if (!accountId || numAmount <= 0) {
      setError("Silakan pilih akun provider dan isi nominal transaksi");
      return;
    }
    if (paymentStatus === "HUTANG" && !customerName.trim()) {
      setError("Hutang harus punya nama nasabah — siapa yang berhutang?");
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
          paymentStatus,
          tanggal,
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
      setTotalCollected("");
      setPaymentStatus("PAID");
      setTanggal(nowLocalInput());
      setNotes("");
      setNameTouched(false);
      // Kontak baru → daftarkan otomatis agar riwayat & profit terkumpul
      // di halaman Kontak Pelanggan (409 "sudah ada" diabaikan saja).
      const cleanName = customerName.trim();
      if (cleanName && !customerNames.includes(cleanName)) {
        fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName }),
        })
          .then((r) => r.json())
          .then((j) => {
            if (j.success) setCustomerNames((prev) => [...prev, cleanName]);
          })
          .catch(() => {});
      }
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
      size="2xl"
    >
      {error && (
        <div className="mb-3 p-2.5 rounded-none bg-rose-900/20 border border-rose-700/50 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {/* Baris 1: kategori + provider + metode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              label: `${acc.name} · ${formatRupiah(acc.balance)}`,
            }))}
            placeholder="Pilih provider..."
            required
          />
          <Select
            label="Metode Pembayaran"
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            options={PAYMENT_METHODS}
          />
        </div>

        {/* Baris 2: uang — nominal, admin, fee, total (fee otomatis) */}
        <div className="bg-[#0a0a0a]/30 border border-slate-700/50 p-3 rounded-none">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Nominal Transaksi"
              value={amount}
              onValueChange={setAmount}
              type="number"
              placeholder="0"
              required
              accounting
              fontMono
            />
            <Input
              label="Admin Bank"
              value={adminBank}
              onValueChange={setAdminBank}
              type="number"
              placeholder="0"
              accounting
              fontMono
            />
            <Input
              label="Fee Toko"
              value={storeFee}
              onValueChange={setStoreFee}
              type="number"
              placeholder="0"
              accounting
              fontMono
            />
            <Input
              label="Total Diterima"
              value={totalCollected}
              onValueChange={setTotalCollected}
              placeholder="fee otomatis"
              accounting
              fontMono
            />
          </div>
          <div className="flex items-center justify-end gap-4 pt-2 mt-1 border-t border-slate-700/30 text-[10px]">
            <span className="text-slate-500">Estimasi Laba Bersih:</span>
            <span className="font-bold font-mono text-emerald-400">
              +{formatRupiah(profit)}
            </span>
          </div>
        </div>

        {/* Baris 3: status + tanggal + nama nasabah */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Status Pembayaran"
            value={paymentStatus}
            onValueChange={setPaymentStatus}
            options={[
              { value: "PAID", label: "Lunas Sekarang" },
              { value: "HUTANG", label: "Hutang — Bayar Nanti" },
            ]}
          />
          <DateTimePicker
            label="Tanggal Transaksi"
            value={tanggal}
            onValueChange={setTanggal}
            required
          />
          <div className="relative">
            <Input
              label="Nama Nasabah"
              value={customerName}
              required={paymentStatus === "HUTANG"}
              onValueChange={(v) => {
                setNameTouched(true);
                setCustomerName(v);
              }}
              type="text"
              placeholder="Pak Herman"
              autoComplete="off"
            />
            {/* Autocomplete kontak: pilih yang sudah ada, atau ketik baru
                — nanti otomatis ditambahkan ke kontak saat disimpan */}
            {nameTouched && customerName.trim() && (() => {
              const q = customerName.trim().toLowerCase();
              const sugg = customerNames
                .filter((n) => n.toLowerCase().includes(q) && n !== customerName.trim())
                .slice(0, 6);
              const isNew = !customerNames.some((n) => n.toLowerCase() === q);
              return sugg.length > 0 ? (
                <div className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-white dark:bg-[#0c1220] border border-slate-400/60 shadow-lg max-h-48 overflow-y-auto">
                  {sugg.map((n) => (
                    <div
                      key={n}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNameTouched(false);
                        setCustomerName(n);
                      }}
                      className="px-3 py-2 text-xs font-mono cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-700 dark:text-slate-300"
                    >
                      {n}
                    </div>
                  ))}
                </div>
              ) : isNew ? (
                <p className="mt-1 text-[10px] italic text-amber-500/80">
                  Kontak baru — otomatis ditambahkan saat disimpan
                </p>
              ) : null;
            })()}
          </div>
        </div>

        {/* Baris 4: catatan opsional + info hutang */}
        {paymentStatus === "HUTANG" && (
          <div className="p-2.5 border border-amber-700/40 bg-amber-900/10 text-[10px] text-amber-500/90 leading-relaxed">
            Struk dicatat <strong>HUTANG</strong> — saldo provider terpotong,
            kas &amp; profit belum diakui sampai dilunasi di halaman
            Hutang/Piutang.
            {category === "TARIK_TUNAI" && (
              <span className="block mt-1 text-rose-400">
                Tarik tunai tidak bisa hutang — uang keluar dari toko.
              </span>
            )}
          </div>
        )}
        <Input
          label="No Rekening / No HP / ID Pelanggan"
          value={customerRef}
          onValueChange={setCustomerRef}
          type="text"
          placeholder="Contoh: 00120192847250 / 08123456789"
        />
        <Input
          label="Catatan"
          value={notes}
          onValueChange={setNotes}
          type="text"
          placeholder="Catatan tambahan..."
        />
      </div>

      <Separator className="my-3" />

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
