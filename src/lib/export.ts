/**
 * Utilitas ekspor sederhana — tanpa dependensi tambahan.
 * CSV memakai pemisah `;` + BOM UTF-8 supaya langsung rapi saat dibuka
 * di Excel dengan regional Indonesia (yang memakai koma sebagai desimal).
 */

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell, delimiter: string): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: CsvCell[][], delimiter = ";"): string {
  return rows
    .map((row) => row.map((cell) => escapeCell(cell, delimiter)).join(delimiter))
    .join("\r\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, rows: CsvCell[][], delimiter = ";") {
  const content = "\uFEFF" + toCsv(rows, delimiter);
  triggerDownload(new Blob([content], { type: "text/csv;charset=utf-8;" }), filename);
}

export function downloadText(filename: string, text: string) {
  triggerDownload(new Blob([text], { type: "text/plain;charset=utf-8;" }), filename);
}

/** Nama file aman: tanpa karakter yang ditolak Windows/macOS. */
export function safeFilename(base: string, ext: string): string {
  const stamp = new Date()
    .toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\//g, "-");
  const clean = base.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").toLowerCase();
  return `${clean}-${stamp}.${ext}`;
}
