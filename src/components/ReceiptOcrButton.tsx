"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, FileImage } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";

export interface OcrExtractResult {
  provider: "PLN" | "PDAM" | "BPJS" | "UNKNOWN";
  noPelanggan?: string;
  nama?: string;
  tagihan?: number;
  admin?: number;
  total?: number;
  noRef?: string;
  periodeBulan?: string;
  details: Record<string, any>;
  imagePath: string;
}

interface ReceiptOcrButtonProps {
  onExtract: (result: OcrExtractResult) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ReceiptOcrButton({ onExtract, disabled, size = "sm" }: ReceiptOcrButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar (JPG/PNG/WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/ocr/extract", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Struk berhasil dibaca — silakan cek data");
      onExtract(json.data);
    } catch (err: any) {
      toast.error(err.message || "Gagal membaca struk");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="solid"
        size={size}
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        className="bg-amber-600 hover:bg-amber-500 text-white border-amber-600"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        <span>{loading ? "Membaca..." : "Foto Struk"}</span>
      </Button>
    </>
  );
}

export function ReceiptThumbnail({ path, alt = "Struk" }: { path?: string | null; alt?: string }) {
  if (!path) return null;
  return (
    <div className="inline-flex items-center gap-2 text-[10px] text-slate-400 border border-slate-700 bg-slate-900/50 px-2 py-1">
      <FileImage className="w-3.5 h-3.5 text-amber-500" />
      <a href={path} target="_blank" rel="noreferrer" className="hover:text-amber-500 hover:underline">
        {alt}
      </a>
    </div>
  );
}
