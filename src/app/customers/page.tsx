"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { formatRupiah, formatDateTimeID } from "@/lib/utils";
import { Contact, Zap, Receipt, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { Input, Button, Badge } from "@/components/ui";

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
  const [detail, setDetail] = useState<Aggregate | null>(null);
  const [detailBills, setDetailBills] = useState<DetailBill[]>([]);
  const [detailTxs, setDetailTxs] = useState<DetailTx[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
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
    load();
  }, [load]);

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

  const filtered = rows.filter(
    (c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  // Total untung yang SUDAH CAIR (konsisten dengan dashboard):
  // admin dari tagihan lunas + untung struk kasir.
  const totalUntungCair = filtered.reduce(
    (s, c) => s + c.tagihan.admin + c.transaksi.untung,
    0
  );
  // Potensi untung talangan yang pelanggan belum bayar — ditampilkan terpisah.
  const totalPotensiTalangan = filtered.reduce(
    (s, c) => s + (c.tagihan.adminTalangan || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Header
        title="Kontak Pelanggan"
        subtitle="Riwayat nilai & keuntungan per kontak: tagihan BRILink + transaksi kasir"
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-40">
          <Input value={q} onValueChange={setQ} placeholder="Cari nama kontak..." />
        </div>
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-3 text-xs">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">
            Total Untung Sudah Cair
          </span>
          <p className="font-mono font-bold text-emerald-400 text-base">{formatRupiah(totalUntungCair)}</p>
          {totalPotensiTalangan > 0 && (
            <p className="text-[10px] text-amber-400 mt-1">
              + {formatRupiah(totalPotensiTalangan)} potensi talangan (belum dibayar)
            </p>
          )}
        </div>
      </div>

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none overflow-x-auto">
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                  Belum ada kontak. Kontak dibuat otomatis saat import tagihan atau tambah tagihan.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
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
                      <span className="font-semibold text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.numbers.length === 0 && (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                      {c.numbers.map((n) => (
                        <span
                          key={n.id}
                          className="text-[9px] px-1.5 py-0.5 border border-slate-700 text-slate-400 font-mono"
                        >
                          {n.jenis}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-mono">{c.tagihan.total}</span>
                    <span className="text-[9px] text-slate-500 block leading-tight">
                      {c.tagihan.lunas} lunas · {c.tagihan.talangan} talangan
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                    {formatRupiah(c.tagihan.nilai)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-400 font-bold">
                    {formatRupiah(c.tagihan.admin)}
                    {(c.tagihan.adminTalangan || 0) > 0 && (
                      <span className="text-[9px] text-amber-400 block leading-tight font-normal">
                        talangan +{formatRupiah(c.tagihan.adminTalangan)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                    {c.tagihan.outstanding > 0 ? formatRupiah(c.tagihan.outstanding) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    {c.transaksi.count > 0 ? c.transaksi.count : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-400">
                    {c.transaksi.count > 0 ? formatRupiah(c.transaksi.untung) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              <div>
                <h3 className="text-sm font-bold text-white">{detail.name}</h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  {detail.numbers.map((n) => `${n.jenis}: ${n.noPelanggan}`).join("  •  ") || "Tanpa nomor layanan"}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-1.5 hover:bg-slate-800 rounded-none transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-800">
              <div className="bg-[#080810] border border-slate-800 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Nilai Tagihan</p>
                <p className="font-mono font-bold text-white text-sm">{formatRupiah(detail.tagihan.nilai)}</p>
              </div>
              <div className="bg-[#080810] border border-slate-800 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Untung Sudah Cair</p>
                <p className="font-mono font-bold text-emerald-400 text-sm">
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
                <p className="font-mono font-bold text-amber-400 text-sm">
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
                              <span className="font-mono text-slate-300">
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
                              <span className="font-mono text-slate-300">{formatRupiah(t.amount)}</span>
                              <span className="font-mono text-emerald-400">
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
    </div>
  );
}
