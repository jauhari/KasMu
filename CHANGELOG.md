# KasMu - Changelog

## [2.0.0] - 2026-10-21

### Diubah (Breaking Design)

- **Menghapus semua AI slop UI**: rounded corners berlebihan, shadow-sm generik, warna blue/slate standar diganti dengan design system sharp/terminal
- **Menghapus elemen bawaan browser**: `<input>`, `<form>`, `<select>` native tidak lagi digunakan
- **Custom UI component library**: `src/components/ui/` dengan Button, Input, Select, Modal, Label, Badge, Separator, Form
- **Design system baru**: latar `#050507`, panel `#0d0d11`, aksen amber `#f59e0b`, font monospace untuk angka, sharp corners (rounded-none)

### Komponen Baru (`src/components/ui/`)

- `button.tsx` — Tombol kustom (solid, ghost, outline, danger)
- `input.tsx` — Input kustom berbasis div (tanpa `<input>` bawaan)
- `select.tsx` — Dropdown kustom (tanpa `<select>` bawaan)
- `modal.tsx` — Modal dialog kustom
- `form.tsx` — Wrapper form kustom (tanpa `<form>` bawaan)
- `label.tsx`, `badge.tsx`, `separator.tsx` — Pendukung UI

### Halaman Direfactor

- `src/app/login/LoginForm.tsx` — PIN input custom, keypad touch, tanpa `<form>`/`<input>` terlihat
- `src/app/transaksi/page.tsx` — Search + kategori pakai custom Input/Select
- `src/app/hutang-piutang/page.tsx` — Form tambah catatan pakai custom Input
- `src/app/mutasi-kas/page.tsx` — Form biaya pakai custom Input
- `src/app/opname/page.tsx` — Kalkulator pecahan uang pakai custom Input
- `src/app/saldo/page.tsx` — Form akun provider pakai custom Input/Select
- `src/app/laporan/page.tsx` — Filter periode pakai custom Select
- `src/app/backup/page.tsx` — Restore pakai file input hidden
- `src/app/staff/page.tsx` — Log shift, styling baru
- `src/app/DashboardClient.tsx` — KPI cards, tabel, styling anti-slop
- `src/components/AppShell.tsx` — Layout, sidebar, bottom nav, styling baru
- `src/components/Header.tsx` — Header halaman, styling baru
- `src/components/Sidebar.tsx` — Navigasi, styling baru
- `src/components/QuickTransactionModal.tsx` — Modal transaksi pakai semua komponen UI baru

### File Baru

- `src/app/globals.css` — Design system CSS (anti-AI slop)
- `CHANGELOG.md` — Catatan perubahan (baru)

### Dihapus

- `sonner` dependency (Toaster) — diganti dengan notifikasi inline/custom
- Semua `rounded-2xl`, `rounded-xl`, `shadow-sm`, `bg-slate-100`, `bg-white` di seluruh komponen

## [1.0.0] - 2026-10-21

- Rilis awal KasMu — Aplikasi Pembukuan Mini-ATM & Keagenan Bank
- Fitur: transaksi, auth, dashboard, laporan, opname, saldo, hutang/piutang, mutasi kas, backup/restore, staff
- Stack: Next.js 15, TypeScript, Prisma, Tailwind, shadcn-ish UI
