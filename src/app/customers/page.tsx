"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { formatRupiah, formatDateTimeID } from "@/lib/utils";
import { Contact, Zap, Receipt, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Input, Button, Badge, Select, Modal } from "@/components/ui";

interface Aggregate {
  id: string;
  name: string;
  numbers: { id: string; jenis: string; noPelanggan: string }[];
  tagihan: {
    total: number;
    lunas: number;
    talangan: number;
    belum: number;
    nilai: number;
    admin: number;
    adminTalangan: number;
    outstanding: number;
  };
  transaksi: { count: number; total: number; untung: number };
}

export interface DetailBill {
  id: string;
  bulan: string;
  jenis: string;
  noPelanggan: string;
  status: string;
  tagihan: number | null;
  admin: number | null;
  total: number | null;
  providerPaidAt: string | null;
  customerPaidAt: string | null;
  customer: { id: string; name: string };
}

interface DetailTx {
  id: string;
  txNumber: string;
  category: string;
  amount: number;
  netProfit: number;
  createdAt: string;
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Aggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Aggregate | null>(null);

  // Modal tambah kontak baru
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactJenis, setNewContactJenis] = useState("PLN");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Modal tambah nomor layanan ke kontak yang sudah ada
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [addNumberJenis, setAddNumberJenis] = useState("PLN");
  const [addNumberValue, setAddNumberValue] = useState("");
  const [addingNumber, setAddingNumber] = useState(false);
  const [detailBills, setDetailBills] = useState<DetailBill[]>([]);
  const [detailTxs, setDetailTxs] = useState<DetailTx[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (search?: string, filterJenis?: string) => {
    try {
      const params = new URLSearchParams();
      if (search?.trim()) params.set("search", search.trim());
      if (filterJenis) params.set("jenis", filterJenis);
      const res = await fetch(`/api/customers?${params.toString()}`);
      const json = await res.json();
      if (json.success) setRows(json.data);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat kontak");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => load(q, jenis), 300);
    return () => clearTimeout(timer);
  }, [load, q, jenis]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Nomor disalin");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim()) {
      toast.error("Nama kontak wajib diisi");
      return;
    }
    setAddingContact(true);
    try {
      const numbers = newContactNumber.trim()
        ? [{ jenis: newContactJenis, noPelanggan: newContactNumber.trim() }]
        : [];
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContactName.trim(),
          phone: newContactPhone.trim() || undefined,
          numbers,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Kontak baru tersimpan");
      setShowAddContact(false);
      load(q, jenis);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan kontak");
    } finally {
      setAddingContact(false);
    }
  };

  const handleAddNumber = async () => {
    if (!detail) return;
    if (!addNumberValue.trim()) {
      toast.error("Nomor pelanggan wajib diisi");
      return;
    }
    setAddingNumber(true);
    try {
      const res = await fetch(`/api/customers/${detail.id}/numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis: addNumberJenis,
          noPelanggan: addNumberValue.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Nomor layanan ditambahkan");
      setShowAddNumber(false);
      // refresh detail
      const updated = rows.find((r) => r.id === detail.id);
      if (updated) {
        const newNumbers = [...updated.numbers, { id: json.data.id, jenis: json.data.jenis, noPelanggan: json.data.noPelanggan }];
        setDetail({ ...detail, numbers: newNumbers });
      }
      load(q, jenis);
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah nomor");
    } finally {
      setAddingNumber(false);
    }
  };

  const openDetail = async (c: Aggregate) => {
    setDetail(c);
    setDetailLoading(true);
    try {
      const [billRes, txRes] = await Promise.all([
        fetch(`/api/bills?customerId=${c.id}`),
        fetch(`/api/transactions?search=${encodeURIComponent(c.name)}`),
      ]);
      const billJson = await billRes.json();
      const txJson = await txRes.json();
      setDetailBills(billJson.success ? billJson.data : []);
      setDetailTxs(
        txJson.success
          ? (txJson.data as (DetailTx & { customerName?: string })[])
              .filter((t) => t.customerName === c.name)
              .slice(0, 50)
          : []
      );
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Total untung yang SUDAH CAIR (konsisten dengan dashboard):
  // admin dari tagihan lunas + untung struk kasir.
  const totalUntungCair = rows.reduce(
    (s, c) => s + c.tagihan.admin + c.transaksi.untung,
    0
  );
  // Potensi untung talangan yang pelanggan belum bayar — ditampilkan terpisah.
  const totalPotensiTalangan = rows.reduce(
    (s, c) => s + (c.tagihan.adminTalangan || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Header
        title="Kontak Pelanggan"
        subtitle="Riwayat nilai & keuntungan per kontak: tagihan BRILink + transaksi kasir"
      />

      {/* Toolbar */}
      <div className="bg-[#0d0d11] border border-slate-700 rounded-none">
        <div className="p-4 space-y-3">
          <Input
            label="Cari Kontak"
            value={q}
            onValueChange={setQ}
            placeholder="Nama atau nomor pelanggan…"
          />
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <Select
                label="Layanan"
                value={jenis}
                onValueChange={setJenis}
                options={[
                  { value: "", label: "Semua Layanan" },
                  { value: "PLN", label: "PLN" },
                  { value: "PDAM", label: "PDAM" },
                  { value: "BPJS TK", label: "BPJS TK" },
                  { value: "BPJS Kes", label: "BPJS Kes" },
                ]}
              />
            </div>
            <Button
              variant="solid"
              size="md"
              className="h-[42px] px-5 shrink-0 whitespace-nowrap"
              onClick={() => {
                setNewContactName("");
                setNewContactPhone("");
                setNewContactJenis("PLN");
                setNewContactNumber("");
                setShowAddContact(true);
              }}
            >
              + Tambah Kontak
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-slate-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          <div className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-slate-500">
              Total Untung Sudah Cair
            </p>
            <p className="font-mono font-bold text-emerald-400 text-lg leading-tight">
              {formatRupiah(totalUntungCair)}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-slate-500">
              Potensi Untung Talangan
            </p>
            <p className="font-mono font-bold text-amber-400 text-lg leading-tight">
              {formatRupiah(totalPotensiTalangan)}
            </p>
            <p className="text-[9px] text-slate-600">dari tagihan talangan yang belum dibayar</p>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-[#0d0d11] border border-slate-700 rounded-none overflow-x-auto">
        <table className="w-full text-xs min-w-[880px]">
          <thead>
            <tr className="border-b border-slate-700 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Kontak</th>
              <th className="px-3 py-3">Layanan</th>
              <th className="px-3 py-3 text-center">Tagihan</th>
              <th className="px-3 py-3 text-right">Nilai Tagihan</th>
              <th className="px-3 py-3 text-right">Untung Admin</th>
              <th className="px-3 py-3 text-right">Talangan</th>
              <th className="px-3 py-3 text-center">Trans. Kasir</th>
              <th className="px-3 py-3 text-right">Untung Kasir</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                  Memuat kontak...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                  Belum ada kontak. Kontak dibuat otomatis saat import tagihan atau tambah tagihan.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#15151a] border border-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-300">
                        {c.name.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "?"}
                      </div>
                      <span className="font-semibold text-white whitespace-nowrap">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      {c.numbers.length === 0 && (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                      {c.numbers.map((n) => (
                        <div key={n.id} className="flex items-center gap-2 text-xs whitespace-nowrap">
                          <span className="px-2 py-1 border border-slate-700 bg-[#15151a] text-slate-400 font-mono font-semibold">
                            {n.jenis}
                          </span>
                          <span className="font-mono font-bold text-white tracking-wide text-sm">
                            {n.noPelanggan}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(n.noPelanggan, `num-${n.id}`);
                            }}
                            title="Salin nomor"
                            className="p-1 text-slate-600 hover:text-amber-500 hover:bg-slate-800 transition-colors"
                          >
                            {copiedId === `num-${n.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-mono">{c.tagihan.total}</span>
                    <span className="text-[9px] text-slate-500 block leading-tight">
                      {c.tagihan.lunas} lunas · {c.tagihan.talangan} talangan
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-white">
                    {formatRupiah(c.tagihan.nilai)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">
                    {formatRupiah(c.tagihan.admin)}
                    {(c.tagihan.adminTalangan || 0) > 0 && (
                      <span className="text-[9px] text-amber-400 block leading-tight font-normal">
                        talangan +{formatRupiah(c.tagihan.adminTalangan)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-400">
                    {c.tagihan.outstanding > 0 ? formatRupiah(c.tagihan.outstanding) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-semibold text-white">
                    {c.transaksi.count > 0 ? c.transaksi.count : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-400">
                    {c.transaksi.count > 0 ? formatRupiah(c.transaksi.untung) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(c);
                      }}
                      className="px-3 py-1.5 bg-[#15151a] border border-slate-700 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
                    >
                      Kelola
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Daftar kartu (mobile) */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="bg-[#0d0d11] border border-slate-700 px-4 py-10 text-center text-xs text-slate-500">
            Memuat kontak...
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-[#0d0d11] border border-slate-700 px-4 py-10 text-center text-xs text-slate-500">
            Belum ada kontak.
          </div>
        ) : (
          rows.map((c) => (
            <div key={c.id} className="bg-[#0d0d11] border border-slate-700">
              <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-[#15151a] border border-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-300">
                    {c.name.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {c.tagihan.total} tagihan · {c.transaksi.count} transaksi kasir
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openDetail(c)}
                  className="px-2.5 py-1.5 bg-[#15151a] border border-slate-700 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors shrink-0"
                >
                  Kelola
                </button>
              </div>

              <div className="px-3 py-2.5 space-y-1.5">
                {c.numbers.length === 0 ? (
                  <p className="text-[10px] text-slate-600">Belum ada nomor layanan</p>
                ) : (
                  c.numbers.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-2 bg-[#080810] border border-slate-800 px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 border border-slate-700 bg-[#15151a] text-[9px] font-mono font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                          {n.jenis}
                        </span>
                        <span className="font-mono font-bold text-amber-400 text-sm tracking-wide truncate">
                          {n.noPelanggan}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(n.noPelanggan, `m-num-${n.id}`)}
                        className="p-1.5 text-slate-500 hover:text-amber-500 shrink-0"
                        title="Salin nomor"
                      >
                        {copiedId === `m-num-${n.id}` ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800">
                <div className="px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Untung</p>
                  <p className="font-mono font-bold text-emerald-400 text-xs">
                    {formatRupiah(c.tagihan.admin + c.transaksi.untung)}
                  </p>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Talangan</p>
                  <p className="font-mono font-bold text-amber-400 text-xs">
                    {c.tagihan.outstanding > 0 ? formatRupiah(c.tagihan.outstanding) : "-"}
                  </p>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Nilai</p>
                  <p className="font-mono font-bold text-white text-xs">
                    {formatRupiah(c.tagihan.nilai)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Detail Kontak */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div
            className="absolute inset-0"
            onClick={() => setDetail(null)}
          />
          <div className="relative bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#15151a] border border-slate-600 flex items-center justify-center shrink-0 font-bold text-xs text-slate-300">
                  {detail.name.slice(0, 2).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{detail.name}</h3>
                  <p className="text-[10px] text-slate-500">
                    {detail.numbers.length} nomor layanan · {detail.tagihan.total} tagihan ·{" "}
                    {detail.transaksi.count} transaksi kasir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-1.5 hover:bg-slate-800 rounded-none transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Nomor Layanan */}
            <div className="px-5 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Nomor Layanan
                </p>
                <Button
                  variant="solid"
                  size="sm"
                  onClick={() => {
                    setAddNumberJenis("PLN");
                    setAddNumberValue("");
                    setShowAddNumber(true);
                  }}
                >
                  + Tambah Nomor
                </Button>
              </div>
              {detail.numbers.length === 0 ? (
                <div className="bg-[#080810] border border-dashed border-slate-700 px-3 py-4 text-center">
                  <p className="text-slate-400 text-xs font-semibold">Belum ada nomor layanan</p>
                  <p className="text-slate-600 text-[10px] mt-1">
                    Klik tombol "+ Tambah Nomor" untuk menambah nomor PLN, PDAM, BPJS, dll.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail.numbers.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between bg-[#080810] border border-slate-700 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 border border-slate-700 bg-[#15151a] text-slate-400 text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
                          {n.jenis}
                        </span>
                        <span className="font-mono font-bold text-amber-400 text-base tracking-wider truncate">
                          {n.noPelanggan}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(n.noPelanggan, `detail-${n.id}`)}
                        title="Salin nomor"
                        className="p-2 text-slate-500 hover:text-amber-500 hover:bg-slate-800 transition-colors shrink-0"
                      >
                        {copiedId === `detail-${n.id}` ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-800">
              <div className="bg-[#080810] border border-slate-800 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Nilai Tagihan</p>
                <p className="font-mono font-bold text-white text-lg">{formatRupiah(detail.tagihan.nilai)}</p>
              </div>
              <div className="bg-[#080810] border border-slate-800 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Untung Sudah Cair</p>
                <p className="font-mono font-bold text-emerald-400 text-lg">
                  {formatRupiah(detail.tagihan.admin + detail.transaksi.untung)}
                </p>
                {(detail.tagihan.adminTalangan || 0) > 0 && (
                  <p className="text-[9px] text-amber-400 mt-0.5">
                    + {formatRupiah(detail.tagihan.adminTalangan)} potensi talangan
                  </p>
                )}
              </div>
              <div className="bg-[#080810] border border-slate-800 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Talangan Hutang</p>
                <p className="font-mono font-bold text-amber-400 text-lg">
                  {formatRupiah(detail.tagihan.outstanding)}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {detailLoading ? (
                <p className="text-center text-slate-500 text-xs py-6">Memuat riwayat...</p>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" /> Tagihan BRILink
                    </p>
                    {detailBills.length === 0 ? (
                      <p className="text-slate-600 text-[11px]">Tidak ada tagihan.</p>
                    ) : (
                      <div className="space-y-1">
                        {detailBills.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between bg-[#080810] border border-slate-800 px-3 py-2 text-[11px]"
                          >
                            <div>
                              <span className="text-white font-semibold">{b.jenis}</span>
                              <span className="text-slate-500 font-mono ml-2">{b.bulan}</span>
                              <span className="text-slate-600 font-mono text-[10px] ml-2 block">
                                {b.noPelanggan}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold text-white text-sm">
                                {b.total !== null ? formatRupiah(b.total) : "-"}
                              </span>
                              {b.status === "LUNAS" && <Badge variant="success">Lunas</Badge>}
                              {b.status === "TALANGAN" && <Badge variant="warning">Talangan</Badge>}
                              {b.status === "BELUM" && <Badge variant="danger">Belum</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Receipt className="w-3 h-3 text-blue-400" /> Transaksi Kasir Terakhir
                    </p>
                    {detailTxs.length === 0 ? (
                      <p className="text-slate-600 text-[11px]">
                        Belum ada transaksi kasir dengan nama ini.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {detailTxs.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between bg-[#080810] border border-slate-800 px-3 py-2 text-[11px]"
                          >
                            <div>
                              <span className="text-slate-300">{t.txNumber}</span>
                              <span className="text-slate-600 ml-2">
                                {formatDateTimeID(t.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold text-white text-sm">{formatRupiah(t.amount)}</span>
                              <span className="font-mono font-semibold text-emerald-400 text-sm">
                                +{formatRupiah(t.netProfit)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Kontak Baru */}
      <Modal isOpen={showAddContact} onClose={() => setShowAddContact(false)} title="Tambah Kontak Baru">
        <div className="space-y-4 text-xs">
          <Input
            label="Nama Kontak"
            value={newContactName}
            onValueChange={setNewContactName}
            required
          />
          <Input
            label="No. HP (opsional)"
            value={newContactPhone}
            onValueChange={setNewContactPhone}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Jenis Layanan"
              value={newContactJenis}
              onValueChange={setNewContactJenis}
              options={[
                { value: "PLN", label: "PLN" },
                { value: "PDAM", label: "PDAM" },
                { value: "BPJS TK", label: "BPJS TK" },
                { value: "BPJS Kes", label: "BPJS Kes" },
                { value: "PULSA", label: "Pulsa" },
                { value: "TOKEN", label: "Token Listrik" },
              ]}
            />
            <Input
              label="No. Pelanggan (opsional)"
              value={newContactNumber}
              onValueChange={setNewContactNumber}
              fontMono
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddContact(false)}>
              Batal
            </Button>
            <Button variant="solid" size="sm" onClick={handleAddContact} disabled={addingContact}>
              {addingContact ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Tambah Nomor Layanan */}
      <Modal isOpen={showAddNumber} onClose={() => setShowAddNumber(false)} title="Tambah Nomor Layanan">
        <div className="space-y-4 text-xs">
          <Select
            label="Jenis Layanan"
            value={addNumberJenis}
            onValueChange={setAddNumberJenis}
            options={[
              { value: "PLN", label: "PLN" },
              { value: "PDAM", label: "PDAM" },
              { value: "BPJS TK", label: "BPJS TK" },
              { value: "BPJS Kes", label: "BPJS Kes" },
              { value: "PULSA", label: "Pulsa" },
              { value: "TOKEN", label: "Token Listrik" },
            ]}
          />
          <Input
            label="No. Pelanggan"
            value={addNumberValue}
            onValueChange={setAddNumberValue}
            fontMono
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddNumber(false)}>
              Batal
            </Button>
            <Button variant="solid" size="sm" onClick={handleAddNumber} disabled={addingNumber}>
              {addingNumber ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
