"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import ReceiptModal from "@/components/ReceiptPrinter";
import TagihanSection from "@/components/TagihanSection";
import { formatRupiah } from "@/lib/utils";
import { Search, Filter, Printer, CircleCheck, ArrowUpDown, RefreshCw } from "lucide-react";
import { Input, Select, DateTimePicker } from "@/components/ui";
import { toast } from "sonner";

type Tab = "struk" | "tagihan";

function TransaksiInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "tagihan" ? "tagihan" : "struk"
  );
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("tanggal_desc");
  const [role, setRole] = useState<string>("");
  const [lunasTarget, setLunasTarget] = useState<any>(null);
  const [lunasAt, setLunasAt] = useState("");

  const localNow = () => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRole(j.data.role);
      })
      .catch(() => {});
  }, []);

  const displayTx = useMemo(() => {
    let rows = [...transactions];
    if (statusFilter === "TALANGAN") {
      rows = rows.filter((tx) => tx.bill && tx.bill.status !== "LUNAS");
    } else if (statusFilter === "LUNAS_BILL") {
      rows = rows.filter((tx) => tx.bill && tx.bill.status === "LUNAS");
    } else if (statusFilter === "KASIR") {
      rows = rows.filter((tx) => !tx.bill);
    } else if (statusFilter === "HUTANG") {
      rows = rows.filter((tx) => tx.status === "HUTANG");
    }
    const dir = sortKey.endsWith("_asc") ? 1 : -1;
    if (sortKey.startsWith("tanggal")) {
      rows.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir);
    } else if (sortKey.startsWith("nama")) {
      rows.sort((a, b) =>
        dir * String(a.customerName || "").localeCompare(String(b.customerName || ""), "id")
      );
    } else if (sortKey.startsWith("nominal")) {
      rows.sort((a, b) => (a.amount - b.amount) * dir);
    } else if (sortKey.startsWith("profit")) {
      rows.sort((a, b) => (a.netProfit - b.netProfit) * dir);
    }
    return rows;
  }, [transactions, statusFilter, sortKey]);

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("category", selectedCategory);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedCategory]);

  const handleLunasStruk = async (tx: any, paidAt?: string) => {
    try {
      const res = await fetch(`/api/bills/${tx.billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "LUNAS",
          customerPaidAt: paidAt || new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${tx.customerName} Lunas — kas +${formatRupiah(tx.amount)}`);
      setLunasTarget(null);
      loadTransactions();
    } catch (err: any) {
      toast.error(err.message || "Gagal tandai lunas");
    }
  };

  const requestLunas = (tx: any) => {
    if (role === "OWNER") {
      setLunasTarget(tx);
      setLunasAt(localNow());
    } else {
      handleLunasStruk(tx);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Buku Transaksi"
        subtitle="Semua mutasi: struk kasir & tagihan BRILink pelanggan"
      />

      {/* Tab */}
      <div className="flex gap-0 border border-slate-700 bg-[#0d0d11] w-fit">
        {(
          [
            ["struk", "Struk Kasir"],
            ["tagihan", "Tagihan Pelanggan"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
              tab === key
                ? "bg-emerald-600 text-white"
                : "bg-transparent text-slate-400 hover:text-white hover:bg-[#15151a]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "struk" ? (
        <>
          <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between transition-colors">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <Input
                value={search}
                onValueChange={setSearch}
                placeholder="Cari no struk, nama nasabah, no HP..."
                className="w-full pl-9 pr-10"
              />
              <button
                onClick={() => loadTransactions()}
                className="absolute right-2 top-2.5 text-slate-500 hover:text-amber-500 transition-colors"
                title="Cari / muat ulang"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: "", label: "Semua Status" },
                    { value: "TALANGAN", label: "Belum Dibayar (Talangan)" },
                    { value: "LUNAS_BILL", label: "Sudah Dibayar (Lunas)" },
                    { value: "KASIR", label: "Kasir Biasa (non-tagihan)" },
                    { value: "HUTANG", label: "Hutang Pelanggan" },
                  ]}
                  placeholder="Status"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <Select
                  value={sortKey}
                  onValueChange={setSortKey}
                  options={[
                    { value: "tanggal_desc", label: "Terbaru dulu" },
                    { value: "tanggal_asc", label: "Terlama dulu" },
                    { value: "nama_asc", label: "Nama A → Z" },
                    { value: "nama_desc", label: "Nama Z → A" },
                    { value: "nominal_desc", label: "Nominal terbesar" },
                    { value: "nominal_asc", label: "Nominal terkecil" },
                    { value: "profit_desc", label: "Profit terbesar" },
                    { value: "profit_asc", label: "Profit terkecil" },
                  ]}
                  placeholder="Urutkan"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  options={[
                    { value: "", label: "Semua Kategori" },
                    ...Object.entries(CATEGORIES_MAP).map(([value, label]) => ({ value, label })),
                  ]}
                  placeholder="Kategori"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0d0d11] border border-slate-700 rounded-none shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#15151a] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No Transaksi / Waktu</th>
                    <th className="px-4 py-3">Layanan / Provider</th>
                    <th className="px-4 py-3">Nasabah / Referensi</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                    <th className="px-4 py-3 text-right">Fee / Admin</th>
                    <th className="px-4 py-3 text-right">Profit Bersih</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-400">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-600">
                        Memuat daftar transaksi...
                      </td>
                    </tr>
                  ) : displayTx.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-600">
                        Tidak ada transaksi ditemukan
                      </td>
                    </tr>
                  ) : (
                    displayTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#15151a]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-200 text-[11px]">{tx.txNumber}</div>
                          <div className="text-[10px] text-slate-600">
                            {new Date(tx.createdAt).toLocaleString("id-ID")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {tx.category.replace(/_/g, " ")}
                          </div>
                          {tx.billId && (
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border ${
                                tx.txNumber?.startsWith("KIRIM")
                                  ? "border-amber-700/50 bg-amber-900/20 text-amber-500"
                                  : "border-emerald-700/50 bg-emerald-900/20 text-emerald-400"
                              }`}
                            >
                              {tx.txNumber?.startsWith("KIRIM") ? "Kirim (potong saldo)" : "Terima kasir"}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-600 font-mono">{tx.account?.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{tx.customerName || "-"}</div>
                          <div className="text-[10px] text-slate-600 font-mono">{tx.customerRef || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-white">
                          {formatRupiah(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {tx.billId && tx.bill && tx.bill.admin && tx.storeFee === 0 ? (
                            <>
                              <div className="text-slate-500">—</div>
                              <div className="text-[10px] text-amber-500/70">
                                admin {formatRupiah(tx.bill.admin)} saat pelanggan bayar
                              </div>
                            </>
                          ) : (
                            <div className="text-amber-500 font-semibold">{formatRupiah(tx.storeFee)}</div>
                          )}
                          <div className="text-[10px] text-slate-600">-{formatRupiah(tx.adminBank)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-emerald-400">
                          {tx.netProfit > 0 ? `+${formatRupiah(tx.netProfit)}` : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.bill && tx.bill.status !== "LUNAS" ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-none text-[9px] font-semibold border border-amber-700/50 bg-amber-900/20 text-amber-400">
                              Talangan
                            </span>
                          ) : tx.status === "HUTANG" ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-none text-[9px] font-semibold border border-rose-700/50 bg-rose-900/20 text-rose-400">
                              HUTANG
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded-none text-[9px] font-semibold border border-emerald-700/50 bg-emerald-900/20 text-emerald-400">
                              {tx.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {tx.bill && tx.bill.status !== "LUNAS" && (
                              <button
                                onClick={() => requestLunas(tx)}
                                title="Pelanggan sudah bayar — tandai tagihan LUNAS & catat kas masuk"
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-none border border-amber-700/60 text-amber-500 hover:bg-amber-600/10 font-semibold text-[10px] uppercase transition-colors"
                              >
                                <CircleCheck className="w-3.5 h-3.5" />
                                Lunas
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedTxForReceipt(tx)}
                              title="Cetak Struk Thermal"
                              className="p-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <QuickTransactionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={loadTransactions}
          />

          <ReceiptModal
            transaction={selectedTxForReceipt}
            onClose={() => setSelectedTxForReceipt(null)}
          />

          {lunasTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
              <div className="bg-[#0c1220] border border-slate-700 rounded-none w-full max-w-sm p-5 text-white shadow-xl space-y-4">
                <h3 className="text-[10px] uppercase tracking-[0.05em] font-bold">
                  Tandai Lunas — {lunasTarget.customerName}
                </h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="km-label">Waktu Pelunasan</label>
                    <DateTimePicker
                      value={lunasAt}
                      onValueChange={setLunasAt}
                      className="w-full"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                      Diisi waktu sekarang secara default — ubah jika pelanggan
                      membayar di tanggal/waktu lain. Kas masuk &amp; profit admin
                      dicatat pada waktu tersebut.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setLunasTarget(null)}
                      className="px-3.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium text-xs transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLunasStruk(lunasTarget, new Date(lunasAt).toISOString())}
                      className="px-4 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                    >
                      Simpan Lunas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <TagihanSection />
      )}
    </div>
  );
}

const CATEGORIES_MAP: Record<string, string> = {
  SETOR_TUNAI: "Setor Tunai",
  TARIK_TUNAI: "Tarik Tunai",
  TRANSFER_BANK: "Transfer Antar Bank",
  TOPUP_EWALLET: "Topup E-Wallet",
  TOKEN_PLN: "Token Listrik PLN",
  PULSA_DATA: "Pulsa & Data",
  TAGIHAN_PLN: "Tagihan PLN",
  TAGIHAN_BPJS: "Tagihan BPJS",
  TAGIHAN_PDAM: "Tagihan Air PDAM",
  LAINNYA: "Lainnya",
};

export default function TransaksiPage() {
  return (
    <Suspense fallback={null}>
      <TransaksiInner />
    </Suspense>
  );
}
