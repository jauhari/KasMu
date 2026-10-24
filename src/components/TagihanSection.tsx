"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatRupiah, formatDateTimeID, currentBulanID } from "@/lib/utils";
import { Zap, Plus, Upload, CheckCircle2, Clock, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input, Select, Button, Modal, Badge, DateTimePicker } from "@/components/ui";

const JENIS_OPTIONS = [
  { value: "PLN", label: "PLN" },
  { value: "PDAM", label: "PDAM" },
  { value: "BPJS TK", label: "BPJS TK" },
  { value: "BPJS Kes", label: "BPJS Kes" },
];

const STATUS_LABEL: Record<string, string> = {
  LUNAS: "Lunas",
  TALANGAN: "Talangan",
  BELUM: "Belum",
};

interface BillRow {
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
  catatan: string | null;
  customer: { id: string; name: string };
}

interface CustomerRow {
  id: string;
  name: string;
  numbers: { id: string; jenis: string; noPelanggan: string }[];
}

interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function TagihanSection() {
  const [bulan, setBulan] = useState(currentBulanID());
  const [bulanList, setBulanList] = useState<string[]>([]);
  const [fJenis, setFJenis] = useState("SEMUA");
  const [fStatus, setFStatus] = useState("SEMUA");
  const [q, setQ] = useState("");

  const [bills, setBills] = useState<BillRow[]>([]);
  const [totals, setTotals] = useState({
    count: 0, lunas: 0, talangan: 0, belum: 0,
    tagihan: 0, admin: 0, total: 0, talanganOutstanding: 0,
  });
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [kirimAccountId, setKirimAccountId] = useState("");
  const [addAccountId, setAddAccountId] = useState("");

  // modal tambah tagihan
  const [showAdd, setShowAdd] = useState(false);
  const [fBulan, setFBulan] = useState(currentBulanID());
  const [fJenisAdd, setFJenisAdd] = useState("PLN");
  const [customerIdAdd, setCustomerIdAdd] = useState("");
  const [customerNameAdd, setCustomerNameAdd] = useState("");
  const [noPelAdd, setNoPelAdd] = useState("");
  const [statusAdd, setStatusAdd] = useState("TALANGAN");
  const [tagihanAdd, setTagihanAdd] = useState("");
  const [adminAdd, setAdminAdd] = useState("");
  const [catatanAdd, setCatatanAdd] = useState("");
  const [saving, setSaving] = useState(false);

  // modal import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  // modal kirim dari BELUM (isi nominal saat pemotongan)
  const [kirimBill, setKirimBill] = useState<BillRow | null>(null);
  const [kirimTagihan, setKirimTagihan] = useState("");
  const [kirimAdmin, setKirimAdmin] = useState("");

  // role user & modal pelunasan khusus owner (atur waktu bayar)
  const [role, setRole] = useState<string>("");
  const [lunasBill, setLunasBill] = useState<BillRow | null>(null);
  const [lunasAt, setLunasAt] = useState("");

  const localNow = () => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
  };

  const loadBills = useCallback(async () => {
    try {
      const params = new URLSearchParams({ bulan });
      if (fJenis !== "SEMUA") params.set("jenis", fJenis);
      if (fStatus !== "SEMUA") params.set("status", fStatus);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/bills?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setBills(json.data);
        setTotals(json.totals);
        setBulanList(json.bulanList || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat tagihan");
    } finally {
      setLoading(false);
    }
  }, [bulan, fJenis, fStatus, q]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRole(j.data.role);
      })
      .catch(() => {});
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (json.success) {
        const accs: AccountRow[] = json.data;
        setAccounts(accs);
        // Default: akun BRILink kalau ada, kalau tidak akun pertama
        const brilink = accs.find((a) => a.name.toLowerCase().includes("brilink"));
        const def = brilink ? brilink.id : accs[0]?.id || "";
        setKirimAccountId((prev) => prev || def);
        setAddAccountId((prev) => prev || def);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (showAdd) {
      loadCustomers();
      loadAccounts();
    }
  }, [showAdd, loadCustomers, loadAccounts]);

  // pilihan nomor layanan sesuai kontak & jenis terpilih
  const nomorOptions = useMemo(() => {
    const c = customers.find((x) => x.id === customerIdAdd);
    if (!c) return [];
    return c.numbers
      .filter((n) => n.jenis === fJenisAdd)
      .map((n) => ({ value: n.noPelanggan, label: n.noPelanggan }));
  }, [customers, customerIdAdd, fJenisAdd]);

  const resetAdd = () => {
    setFBulan(currentBulanID());
    setFJenisAdd("PLN");
    setCustomerIdAdd("");
    setCustomerNameAdd("");
    setNoPelAdd("");
    setStatusAdd("TALANGAN");
    setTagihanAdd("");
    setAdminAdd("");
    setCatatanAdd("");
    setAddAccountId("");
  };

  const handleAdd = async () => {
    if (!noPelAdd.trim() || (!customerIdAdd && !customerNameAdd.trim())) {
      toast.error("Pilih kontak lama atau isi nama kontak baru, dan no pelanggan");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulan: fBulan,
          jenis: fJenisAdd,
          customerId: customerIdAdd || undefined,
          customerName: customerIdAdd ? undefined : customerNameAdd.trim(),
          noPelanggan: noPelAdd.trim(),
          status: statusAdd,
          tagihan: statusAdd === "BELUM" ? undefined : tagihanAdd.replace(/\./g, ""),
          admin: statusAdd === "BELUM" ? undefined : adminAdd.replace(/\./g, ""),
          accountId: statusAdd !== "BELUM" ? addAccountId || undefined : undefined,
          catatan: catatanAdd.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Tagihan tersimpan");
      setShowAdd(false);
      resetAdd();
      if (json.data.bulan && !bulanList.includes(json.data.bulan)) {
        setBulan(json.data.bulan);
      } else {
        loadBills();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan tagihan");
    } finally {
      setSaving(false);
    }
  };

  const patchBill = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      loadBills();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Gagal update tagihan");
      return false;
    }
  };

  const handleKirim = async () => {
    if (!kirimBill) return;
    const tg = parseInt(kirimTagihan.replace(/\./g, ""), 10);
    const ad = parseInt(kirimAdmin.replace(/\./g, ""), 10);
    if (!Number.isFinite(tg) || !Number.isFinite(ad)) {
      toast.error("Nominal tagihan & admin wajib angka");
      return;
    }
    setSaving(true);
    const ok = await patchBill(kirimBill.id, {
      status: "TALANGAN",
      tagihan: tg,
      admin: ad,
      accountId: kirimAccountId || undefined,
      providerPaidAt: new Date().toISOString(),
    });
    setSaving(false);
    if (ok) {
      const accName = accounts.find((a) => a.id === kirimAccountId)?.name || "akun";
      toast.success(`Bayaran dikirim — saldo ${accName} dipotong (talangan)`);
      setKirimBill(null);
      setKirimTagihan("");
      setKirimAdmin("");
    }
  };

  const handleLunas = async (b: BillRow, paidAt?: string) => {
    const ok = await patchBill(b.id, {
      status: "LUNAS",
      customerPaidAt: paidAt || new Date().toISOString(),
    });
    if (ok) {
      toast.success(`${b.customer.name} Lunas — kas +${formatRupiah(b.total || 0)}`);
      setLunasBill(null);
    }
  };

  const requestLunas = (b: BillRow) => {
    if (role === "OWNER") {
      setLunasBill(b);
      setLunasAt(localNow());
    } else {
      handleLunas(b);
    }
  };

  const handleDelete = async (b: BillRow) => {
    if (!confirm(`Hapus tagihan ${b.customer.name} (${b.jenis} ${b.noPelanggan})?`)) return;
    try {
      const res = await fetch(`/api/bills/${b.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Tagihan dihapus");
      loadBills();
    } catch (err: any) {
      toast.error(err.message || "Gagal hapus");
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error("Tempel data CSV dulu");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/bills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const json = await res.json();
      if (!json.success) {
        const detail = json.detail ? `\n${json.detail.join("\n")}` : "";
        throw new Error(`${json.error}${detail}`);
      }
      toast.success(
        `Import OK: ${json.data.baris} tagihan (baru ${json.data.created}, update ${json.data.updated}, kontak baru ${json.data.customersCreated})`
      );
      setShowImport(false);
      setCsvText("");
      if (json.data.baris > 0) setBulan(bulan || currentBulanID());
      loadBills();
    } catch (err: any) {
      toast.error(err.message, { duration: 8000 });
    } finally {
      setImporting(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "LUNAS") return <Badge variant="success">Lunas</Badge>;
    if (s === "TALANGAN") return <Badge variant="warning">Talangan</Badge>;
    return <Badge variant="danger">Belum</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Select
            label="Periode"
            value={bulan}
            onValueChange={setBulan}
            options={
              bulanList.includes(bulan) || bulanList.length === 0
                ? (bulanList.length ? bulanList.map((b) => ({ value: b, label: b })) : [{ value: bulan, label: bulan }])
                : [{ value: bulan, label: bulan }, ...bulanList.map((b) => ({ value: b, label: b }))]
            }
          />
        </div>
        <div className="w-36">
          <Select
            value={fJenis}
            onValueChange={setFJenis}
            options={[
              { value: "SEMUA", label: "Semua Jenis" },
              ...JENIS_OPTIONS.map((j) => ({ value: j.value, label: j.label })),
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            value={fStatus}
            onValueChange={setFStatus}
            options={[
              { value: "SEMUA", label: "Semua Status" },
              { value: "LUNAS", label: "Lunas" },
              { value: "TALANGAN", label: "Talangan" },
              { value: "BELUM", label: "Belum" },
            ]}
          />
        </div>
        <div className="flex-1 min-w-40">
          <Input
            value={q}
            onValueChange={setQ}
            placeholder="Cari nama pelanggan..."
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport(true)} variant="outline" size="sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </Button>
          <Button
            onClick={() => {
              resetAdd();
              setShowAdd(true);
            }}
            variant="solid"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tagihan</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Tagihan</p>
          <p className="text-lg font-bold font-mono text-white">{formatRupiah(totals.tagihan)}</p>
          <p className="text-[10px] text-slate-600">{totals.count} tagihan</p>
        </div>
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Untung Admin</p>
          <p className="text-lg font-bold font-mono text-emerald-400">{formatRupiah(totals.admin)}</p>
          <p className="text-[10px] text-slate-600">{totals.lunas} lunas / {totals.talangan} talangan / {totals.belum} belum</p>
        </div>
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Talangan Belum Dibayar</p>
          <p className="text-lg font-bold font-mono text-amber-400">{formatRupiah(totals.talanganOutstanding)}</p>
          <p className="text-[10px] text-slate-600">{totals.talangan} pelanggan belum bayar</p>
        </div>
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Terenkani (Total)</p>
          <p className="text-lg font-bold font-mono text-white">{formatRupiah(totals.total)}</p>
          <p className="text-[10px] text-slate-600">tagihan + admin</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d11] border border-slate-700 rounded-none overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-700 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Jenis / Kontak</th>
              <th className="px-3 py-3">No. Pelanggan</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Tagihan</th>
              <th className="px-3 py-3 text-right">Admin</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3">Dibayar ke Provider</th>
              <th className="px-3 py-3">Pelanggan Bayar</th>
              <th className="px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                  Memuat tagihan...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                  Tidak ada tagihan utk periode {bulan}. Gunakan Import CSV atau Tambah Tagihan.
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#15151a] border border-slate-700 flex items-center justify-center shrink-0">
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{b.jenis}</p>
                        <p className="text-[10px] text-slate-500">{b.customer.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{b.noPelanggan}</td>
                  <td className="px-3 py-2.5">{statusBadge(b.status)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                    {b.tagihan !== null ? formatRupiah(b.tagihan) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-400">
                    {b.admin !== null ? formatRupiah(b.admin) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-white">
                    {b.total !== null ? formatRupiah(b.total) : "-"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                    {formatDateTimeID(b.providerPaidAt)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                    {formatDateTimeID(b.customerPaidAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {b.status === "BELUM" && (
                        <button
                          title="Kirim & talangkan"
                          onClick={() => {
                            setKirimBill(b);
                            setKirimTagihan("");
                            setKirimAdmin("3000");
                            if (!kirimAccountId) loadAccounts();
                          }}
                          className="p-1.5 text-amber-400 hover:bg-amber-900/20 border border-amber-700/40 rounded-none transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {b.status === "TALANGAN" && (
                        <button
                          title="Tandai pelanggan bayar (Lunas)"
                          onClick={() => requestLunas(b)}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-900/20 border border-emerald-700/40 rounded-none transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {b.status !== "BELUM" && (
                        <button
                          title="Batalkan ke status Belum"
                          onClick={() => patchBill(b.id, { status: "BELUM" })}
                          className="p-1.5 text-slate-400 hover:bg-slate-800 border border-slate-700 rounded-none transition-colors"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        title="Hapus tagihan"
                        onClick={() => handleDelete(b)}
                        className="p-1.5 text-rose-400 hover:bg-rose-900/20 border border-rose-700/40 rounded-none transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Tagihan */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Tambah Tagihan">
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Periode Bulan"
              value={fBulan}
              onValueChange={setFBulan}
              fontMono
              placeholder="2026-10"
              required
            />
            <Select
              label="Jenis"
              value={fJenisAdd}
              onValueChange={setFJenisAdd}
              options={JENIS_OPTIONS}
              required
            />
          </div>

          <Select
            label="Kontak Pelanggan"
            value={customerIdAdd}
            onValueChange={setCustomerIdAdd}
            options={[
              { value: "", label: "+ Kontak Baru" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {customerIdAdd ? (
            nomorOptions.length > 0 ? (
              <Select
                label={`No Pelanggan (${fJenisAdd})`}
                value={noPelAdd}
                onValueChange={setNoPelAdd}
                options={[{ value: "", label: "Pilih nomor / isi manual" }, ...nomorOptions]}
                required
              />
            ) : null
          ) : (
            <Input label="Nama Kontak Baru" value={customerNameAdd} onValueChange={setCustomerNameAdd} required />
          )}
          <Input
            label="No. Pelanggan"
            value={noPelAdd}
            onValueChange={setNoPelAdd}
            fontMono
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={statusAdd}
              onValueChange={setStatusAdd}
              options={[
                { value: "TALANGAN", label: "Talangan (agen sudah bayar)" },
                { value: "LUNAS", label: "Lunas" },
                { value: "BELUM", label: "Belum Dikirim" },
              ]}
            />
            {statusAdd !== "BELUM" && (
              <div />
            )}
          </div>

          {statusAdd !== "BELUM" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tagihan (Rp)"
                value={tagihanAdd}
                onValueChange={setTagihanAdd}
                accounting
                fontMono
                required
              />
              <Input
                label="Admin (Rp)"
                value={adminAdd}
                onValueChange={setAdminAdd}
                accounting
                fontMono
                required
              />
            </div>
          )}

          {statusAdd !== "BELUM" && (
            <Select
              label="Akun Sumber Pemotongan"
              value={addAccountId}
              onValueChange={setAddAccountId}
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.name} — ${formatRupiah(a.balance)}`,
              }))}
              placeholder="Pilih akun"
              required
            />
          )}

          <Input label="Catatan (opsional)" value={catatanAdd} onValueChange={setCatatanAdd} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Batal
            </Button>
            <Button variant="solid" size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Import */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import CSV Tagihan" size="lg">
        <div className="space-y-3 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Tempel data dari buku tagihan (kolom: Bulan, Jenis, Nama, No. Pelanggan, Status, Tagihan, Admin, Total,
            Dibayar ke Provider, Jam, Pelanggan bayar, Jam, Catatan). Kontak & nomor layanan dibuat otomatis,
            satu kontak bisa punya lebih dari 1 layanan. Import ulang data yang sama tidak akan ganda.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            className="w-full bg-[#080810] border border-slate-700 rounded-none p-3 font-mono text-[11px] text-slate-200 outline-none focus:border-amber-600 transition-colors resize-none"
            placeholder={'"Bulan","Jenis","Nama","No. Pelanggan","Status","Tagihan","Admin","Total",...'}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowImport(false)}>
              Batal
            </Button>
            <Button variant="solid" size="sm" onClick={handleImport} disabled={importing}>
              {importing ? "Mengimpor..." : "Import Sekarang"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Pelunasan khusus owner: atur waktu pelanggan bayar */}
      <Modal isOpen={!!lunasBill} onClose={() => setLunasBill(null)} title="Tandai Lunas">
        {lunasBill && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#080810] border border-slate-800 p-3 space-y-1">
              <p className="font-semibold text-white">
                {lunasBill.jenis} — {lunasBill.customer.name}
              </p>
              <p className="font-mono text-[11px] text-slate-500">{lunasBill.noPelanggan}</p>
            </div>
            <DateTimePicker
              label="Waktu Pelunasan"
              value={lunasAt}
              onValueChange={setLunasAt}
              required
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Default waktu sekarang — ubah jika pelanggan membayar di tanggal/waktu lain.
              Kas masuk &amp; profit admin dicatat pada waktu tersebut.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLunasBill(null)}>
                Batal
              </Button>
              <Button
                variant="solid"
                size="sm"
                onClick={() => handleLunas(lunasBill, new Date(lunasAt).toISOString())}
              >
                Simpan Lunas
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Kirim Talangan dari BELUM */}
      <Modal isOpen={!!kirimBill} onClose={() => setKirimBill(null)} title="Kirim Bayaran Provider">
        {kirimBill && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#080810] border border-slate-800 p-3 space-y-1">
              <p className="font-semibold text-white">
                {kirimBill.jenis} — {kirimBill.customer.name}
              </p>
              <p className="font-mono text-[11px] text-slate-500">{kirimBill.noPelanggan}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tagihan (Rp)"
                value={kirimTagihan}
                onValueChange={setKirimTagihan}
                accounting
                fontMono
                required
              />
              <Input
                label="Admin (Rp)"
                value={kirimAdmin}
                onValueChange={setKirimAdmin}
                accounting
                fontMono
                required
              />
            </div>
            <Select
              label="Akun Sumber Pemotongan"
              value={kirimAccountId}
              onValueChange={setKirimAccountId}
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.name} — ${formatRupiah(a.balance)}`,
              }))}
              placeholder="Pilih akun"
              required
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Dicatat sebagai TALANGAN — waktu kirim: {formatDateTimeID(new Date())} WIB.
              Saldo akun sumber dipotong <b>{kirimTagihan ? formatRupiah(parseInt(kirimTagihan.replace(/\./g, "")) || 0) : "-"}</b> sekarang;
              saat pelanggan bayar nanti, kas akan masuk total dan struk transaksi dibuat otomatis.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setKirimBill(null)}>
                Batal
              </Button>
              <Button variant="solid" size="sm" onClick={handleKirim} disabled={saving}>
                {saving ? "Memproses..." : "Kirim (Talangan)"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
