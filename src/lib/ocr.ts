export interface OcrResult {
  provider: "PLN" | "PDAM" | "BPJS" | "UNKNOWN";
  noPelanggan?: string;
  nama?: string;
  tagihan?: number;
  admin?: number;
  total?: number;
  noRef?: string;
  periodeBulan?: string; // YYYY-MM
  details: Record<string, any>;
  raw?: string;
}

const GEMINI_MODEL = "gemini-1.5-flash";

function parseRupiah(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value).replace(/[^0-9,-]/g, "").replace(/,/g, ".");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function normalizeProvider(value: unknown): OcrResult["provider"] {
  if (typeof value !== "string") return "UNKNOWN";
  const v = value.toUpperCase();
  if (v.includes("PLN") || v.includes("LISTRIK")) return "PLN";
  if (v.includes("PDAM") || v.includes("AIR")) return "PDAM";
  if (v.includes("BPJS")) return "BPJS";
  return "UNKNOWN";
}

function normalizeBulan(value: unknown): string | undefined {
  if (!value) return undefined;
  const s = String(value).trim().toUpperCase();
  // Contoh: NOV26, NOV 2026, 11/2026, 2026-11
  const monthMap: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MEI: "05", MAY: "05",
    JUN: "06", JUL: "07", AGU: "08", AUG: "08", SEP: "09", OKT: "10",
    OCT: "10", NOV: "11", DES: "12", DEC: "12",
  };

  const shortMonthYear = s.match(/^(JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|AUG|SEP|OKT|OCT|NOV|DES|DEC)(\d{2,4})$/);
  if (shortMonthYear) {
    const m = monthMap[shortMonthYear[1]];
    let y = shortMonthYear[2];
    if (y.length === 2) y = (parseInt(y, 10) >= 50 ? "19" : "20") + y;
    return `${y}-${m}`;
  }

  const monthNameYear = s.match(/^(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER)\s+(\d{4})$/);
  if (monthNameYear) {
    const names = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
    const m = String(names.indexOf(monthNameYear[1]) + 1).padStart(2, "0");
    return `${monthNameYear[2]}-${m}`;
  }

  const mmYYYY = s.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (mmYYYY) {
    return `${mmYYYY[2]}-${mmYYYY[1].padStart(2, "0")}`;
  }

  const iso = s.match(/^(\d{4})[\/\-.](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}`;
  }

  return undefined;
}

export async function extractReceipt(imageBase64: string, mimeType: string): Promise<OcrResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY belum diatur");
  }

  const prompt = `Kamu adalah OCR cerdas untuk struk pembayaran tagihan dari agen BRILink/mini ATM di Indonesia.

Analisis gambar struk ini dan kembalikan HANYA JSON valid dengan struktur berikut (tanpa penjelasan di luar JSON):

{
  "provider": "PLN" | "PDAM" | "BPJS" | "UNKNOWN",
  "noPelanggan": "nomor pelanggan/IDPEL",
  "nama": "nama pelanggan",
  "periodeBulan": "YYYY-MM",
  "tagihan": 303713,
  "admin": 3000,
  "total": 306713,
  "noRef": "nomor referensi struk",
  "details": { ... }
}

Aturan:
- "provider": pilih berdasarkan jenis layanan yang tertera (PLN, PDAM, BPJS). Kalau tidak jelas, "UNKNOWN".
- "noPelanggan": untuk PLN isi IDPEL; untuk PDAM isi Nomor Pelanggan; untuk BPJS isi Nomor BPJS.
- "nama": nama pelanggan sesuai struk.
- "periodeBulan": periode tagihan dalam format YYYY-MM. Contoh struk PLN "BL/TH NOV26" → "2026-11". Kalau hanya ada tahun+bulan dalam bahasa Indonesia, ubah ke YYYY-MM.
- "tagihan": nominal tagihan murni (RP TAG PLN / Total Tagihan / Rp Tagihan) dalam angka bulat, tanpa titik/rupiah.
- "admin": biaya admin/bank dalam angka bulat.
- "total": total bayar (tagihan + admin) dalam angka bulat.
- "noRef": nomor referensi / No.Reff / No Ref.
- "details": objek berisi SEMUA field tambahan yang tertera di struk, contoh:
  - PLN: { "tarifDaya": "R1M/900VA", "blTh": "NOV26", "standMeter": "00011604-00011812", "rpTag": 303713, ... }
  - PDAM: { "alamat": "...", "wilayah": "...", "periode": "...", "standMeter": "...", "pemakaian": "...", "totalTagihan": 50000, ... }
  - BPJS: { "jumlahPeserta": 4, "periode": "...", ... }

Jika sebuah nilai tidak tertera di struk, gunakan null atau string kosong. Jangan membuat data sendiri.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini OCR error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const block = text.match(/\{[\s\S]*\}/);
    if (block) {
      try {
        parsed = JSON.parse(block[0]);
      } catch {
        parsed = {};
      }
    } else {
      parsed = {};
    }
  }

  const provider = normalizeProvider(parsed.provider);
  const details = typeof parsed.details === "object" && parsed.details !== null ? parsed.details : {};

  return {
    provider,
    noPelanggan: parsed.noPelanggan || parsed.idpel || parsed.nomorPelanggan || undefined,
    nama: parsed.nama || parsed.namaPelanggan || undefined,
    tagihan: parseRupiah(parsed.tagihan ?? parsed.rpTag ?? parsed.totalTagihan),
    admin: parseRupiah(parsed.admin ?? parsed.adminBank),
    total: parseRupiah(parsed.total ?? parsed.totalBayar),
    noRef: parsed.noRef || parsed.noReff || parsed.nomorReferensi || undefined,
    periodeBulan: normalizeBulan(parsed.periodeBulan ?? parsed.blTh ?? parsed.periode ?? parsed.bulanTahun),
    details,
    raw: text,
  };
}
