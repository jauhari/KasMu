// Script backup otomatis KasMu.
// Menyalin prisma/kasmu.db ke backups/kasmu-YYYYMMDD-HHmmss.db
// dan menyimpan 14 backup terakhir.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DB_PATH = path.join(ROOT, "kasmu.db");
const BACKUP_DIR = path.join(ROOT, "backups");
const KEEP_COUNT = 14;

async function main() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const stat = await fs.stat(DB_PATH);
  if (!stat.isFile()) throw new Error(`DB tidak ditemukan di ${DB_PATH}`);

  const dest = path.join(BACKUP_DIR, `kasmu-${stamp}.db`);
  await fs.copyFile(DB_PATH, dest);

  // Prune: simpan KEEP_COUNT terbaru
  const entries = await Promise.all(
    (await fs.readdir(BACKUP_DIR))
      .filter((f) => f.startsWith("kasmu-") && f.endsWith(".db"))
      .map(async (f) => {
        const p = path.join(BACKUP_DIR, f);
        const s = await fs.stat(p);
        return { name: f, path: p, mtime: s.mtime.getTime() };
      })
  );
  const files = entries.sort((a, b) => b.mtime - a.mtime);

  for (const f of files.slice(KEEP_COUNT)) {
    await fs.unlink(f.path);
  }

  console.log(`Backup OK: ${path.basename(dest)}`);
}

main().catch((e) => {
  console.error("Backup gagal:", e.message);
  process.exit(1);
});
