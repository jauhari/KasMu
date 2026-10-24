"use client";

import { useState } from "react";
import Header from "@/components/Header";
import QuickTransactionModal from "@/components/QuickTransactionModal";
import { HardDriveDownload, Upload, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export default function BackupPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    window.location.href = "/api/backup";
    toast.success("File backup database KasMu berhasil diunduh!");
  };

  const handleSelectFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
  };

  const handleRestoreFile = async () => {
    const input = document.getElementById("km-restore-file-input") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (!confirm("PERINGATAN: Memulihkan backup akan menimpa data yang ada saat ini. Lanjutkan?")) {
      if (input) input.value = "";
      setFileName(null);
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
        if (input) input.value = "";
        setFileName(null);
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

      <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-sm flex items-start gap-3.5 transition-colors">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h3 className="font-bold text-white text-sm">Privasi & Keamanan Data Lokal</h3>
          <p className="text-slate-500 mt-1 leading-relaxed">
            KasMu berjalan sepenuhnya di komputer kasir tanpa ketergantungan server cloud. Seluruh nomor rekening nasabah,
            saldo brankas, dan profit tersimpan di database lokal SQLite. Cadangkan data secara berkala ke flashdisk
            atau folder Google Drive untuk menjaga keamanan jika komputer rusak.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <HardDriveDownload className="w-4 h-4 text-emerald-500" />
            <h4 className="font-bold text-white text-xs">Cadangkan Data (Backup)</h4>
          </div>
          <p className="text-xs text-slate-500">
            Unduh snapshot lengkap seluruh transaksi, akun provider, rekonsiliasi opname, dan riwayat shift ke file JSON.
          </p>
          <Button
            onClick={handleDownloadBackup}
            variant="solid"
            size="sm"
            className="w-full"
          >
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>Unduh Cadangan (.json)</span>
          </Button>
        </div>

        <div className="bg-[#0d0d11] border border-slate-700 rounded-none p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-blue-500" />
            <h4 className="font-bold text-white text-xs">Pulihkan Data (Restore)</h4>
          </div>
          <p className="text-xs text-slate-500">
            Pilih file cadangan JSON yang pernah Anda simpan untuk memulihkan seluruh catatan finansial ke laptop baru.
          </p>
          <Button
            variant="solid"
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-blue-600/20 disabled:opacity-50"
            disabled={restoring}
            onClick={() => {
              const input = document.getElementById("km-restore-file-input") as HTMLInputElement | null;
              input?.click();
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{restoring ? "Memulihkan..." : fileName || "Pilih File Cadangan (.json)"}</span>
          </Button>
          <input
            id="km-restore-file-input"
            type="file"
            accept=".json"
            onChange={(e) => handleSelectFile(e.target.files)}
            disabled={restoring}
            className="hidden"
          />
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
