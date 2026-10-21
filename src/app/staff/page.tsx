"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { formatRupiah } from "@/lib/utils";
import { History } from "lucide-react";

export default function StaffPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadShifts = async () => {
    try {
      const res = await fetch("/api/shifts");
      const json = await res.json();
      if (json.success) setShifts(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Staff & Riwayat Shift"
        subtitle="Log audit buka shift kasir dan rekonsiliasi opname"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 shadow-sm flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-none bg-[#15151a] text-blue-500 border border-slate-700 flex items-center justify-center font-bold text-xs">
              KB
            </div>
            <div>
              <h4 className="font-semibold text-xs text-white">Kasir Kris Brilink</h4>
              <p className="text-[11px] text-slate-600 font-mono">PIN: •••••• | Kasir Aktif</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-none text-[10px] font-bold border border-emerald-700/50 bg-emerald-900/20 text-emerald-400">
            Bertugas
          </span>
        </div>

        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-4 shadow-sm flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-none bg-[#15151a] text-slate-500 border border-slate-700 flex items-center justify-center font-bold text-xs">
              OA
            </div>
            <div>
              <h4 className="font-semibold text-xs text-white">Owner Agen Mini-Atm</h4>
              <p className="text-[11px] text-slate-600 font-mono">PIN: •••••• | Superadmin</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-none text-[10px] font-bold border border-blue-700/50 bg-blue-900/20 text-blue-400">
            Owner
          </span>
        </div>
      </div>

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none shadow-sm overflow-hidden transition-colors">
        <div className="p-3.5 border-b border-slate-700 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-xs text-white">Log Audit & Rekonsiliasi Shift</h3>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#15151a] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700 text-[10px]">
            <tr>
              <th className="px-4 py-3">Kasir</th>
              <th className="px-4 py-3">Mulai Shift</th>
              <th className="px-4 py-3">Selesai Shift</th>
              <th className="px-4 py-3 text-right">Modal Awal</th>
              <th className="px-4 py-3 text-right">Uang Fisik Opname</th>
              <th className="px-4 py-3 text-right">Selisih</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-400">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-600">Memuat riwayat shift...</td>
              </tr>
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-600">Belum ada riwayat shift</td>
              </tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} className="hover:bg-[#15151a]/50">
                  <td className="px-4 py-3 font-semibold text-white">{s.user?.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(s.startTime).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.endTime ? new Date(s.endTime).toLocaleString("id-ID") : "Sedang Berjalan"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{formatRupiah(s.initialCash)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">
                    {s.finalCashCounted !== null ? formatRupiah(s.finalCashCounted) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {s.discrepancy !== null ? (
                      <span
                        className={
                          s.discrepancy === 0
                            ? "text-emerald-500"
                            : s.discrepancy > 0
                            ? "text-blue-500"
                            : "text-rose-500"
                        }
                      >
                        {s.discrepancy > 0 ? "+" : ""}
                        {formatRupiah(s.discrepancy)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded-none text-[9px] font-semibold border ${
                        s.status === "OPEN"
                          ? "border-blue-700/50 bg-blue-900/20 text-blue-400"
                          : "border-slate-700 bg-transparent text-slate-600"
                      }`}
                    >
                      {s.status === "OPEN" ? "SHIFT BUKA" : "DITUTUP"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadShifts}
      />
    </div>
  );
}
