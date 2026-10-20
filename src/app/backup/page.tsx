"use client";

import { useState } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { HardDriveDownload, Upload, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function BackupPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleDownloadBackup = () => {
    window.location.href = "/api/backup";
    toast.success("File backup database KasMu berhasil diunduh!");
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("PERINGATAN: Memulihkan backup akan menimpa data yang ada saat ini. Lanjutkan?")) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        const res = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error);

        toast.success("Database KasMu berhasil dipulihkan!");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        toast.error(err.message || "Gagal memproses file backup");
      } finally {
        setRestoring(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Header
        onOpenQuickTx={() => setIsModalOpen(true)}
        title="Backup & Restore Data"
        subtitle="100% Offline — Data tersimpan aman di komputer Anda sendiri"
      />

      {/* Info Banner */}
      <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-start gap-3.5 transition-colors">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Privasi & Keamanan Data Lokal</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            KasMu berjalan sepenuhnya di komputer kasir tanpa ketergantungan server cloud. Seluruh nomor rekening nasabah,
            saldo brankas, dan profit tersimpan di database lokal SQLite. Cadangkan data secara berkala ke flashdisk
            atau folder Google Drive untuk menjaga keamanan jika komputer rusak.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Backup Card */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <HardDriveDownload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">Cadangkan Data (Backup)</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unduh snapshot lengkap seluruh transaksi, akun provider, rekonsiliasi opname, dan riwayat shift ke file JSON.
          </p>
          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>Unduh Cadangan (.json)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">Pulihkan Data (Restore)</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pilih file cadangan JSON yang pernah Anda simpan untuk memulihkan seluruh catatan finansial ke laptop baru.
          </p>
          <label className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{restoring ? "Memulihkan..." : "Pilih File Cadangan (.json)"}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
