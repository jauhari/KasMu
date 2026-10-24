# KasMu - Changelog

## [2.5.0] - 2026-10-24

### Baru: Form Transaksi Makin Cerdas

- **Fee Toko Otomatis**: isi "Total Diterima dari Pelanggan" (mis. 1.050.000) → Fee Toko terisi sendiri = total − nominal − admin bank; ikut menyesuaikan ulang saat nominal/admin diubah
- **Hutang — Bayar Nanti**: dropdown baru "Status Pembayaran" di form; struk berstatus HUTANG (badge merah, filter "Hutang Pelanggan"), otomatis membuat piutang di Hutang/Piutang atas nama nasabah; pelunasan di sana → struk jadi SUCCESS & profit diakui
- **Nama Nasabah otomatis**: autocomplete kontak dari database; kontak baru otomatis didaftarkan saat struk disimpan riwayat & profit pelanggan terkumpul di Kontak Pelanggan

### Perbaikan

- **Modal close sendiri**: klik di area kosong dalam kotak modal tidak lagi menutup modal (layer backdrop dihilangkan, close hanya dari ✕, Batal, klik luar panel, Esc)
- **Titik ribuan konsisten**: angka di kolom nominal selalu berformat (1.000.000) termasuk saat mengetik; backspace di depan titik tidak lagi terasa mati
- **Blur overlay maksimal** (`bg-black/85 backdrop-blur-xl`), header/nav mobile tak disentuh

## [2.4.0] - 2026-10-21

### Baru: Satu Buku — Import CSV Langsung Jadi Transaksi

- **Menu digabung**: "Tagihan BRILink" bukan lagi menu terpisah — masuk sebagai tab **"Tagihan Pelanggan"** di dalam **Data Transaksi** (tab satunya "Struk Kasir"). `/tagihan` mengarahkan otomatis
- **Import CSV sekarang langsung menggerakkan uang**: setiap baris tagihan dari CSV otomatis membuat struk di Data Transaksi (kirim = struk Akun BRILink; pelanggan bayar = struk Kasir dengan untung admin) dan memutasi saldo akun — tanggal struk mengikuti tanggal di CSV, bukan waktu import
- **Demo nyata pada data Oktober**: 40 tagihan → **61 struk**; BRILink −Rp5.232.767, Kasir +Rp3.510.988, untung tercatat Rp72.780 (admin 23 yang LUNAS; talangan belum dihitung untung — laporan tidak bohong)
- **Idempoten**: import ulang = 0 struk baru, saldo tidak berubah (diuji)
- **Tampilan baris kirim**: kolom admin menunjukkan tulisan "admin RpX saat pelanggan bayar" + badge Talangan (kuning) — tidak lagi tampak "admin hilang"
- **Default otomatis**: tagihan baru/import otomatis pakai akun BRILink (atau bank pertama) sebagai sumber potongan, dan akun CASH_DRAWER ("Kasir") sebagai laci
- **HANDOFF.md**: ditambahkan sebagai dokumen penyerahan (kondisi server, model uang, cara deploy, gotchas)

## [2.3.0] - 2026-10-21

### Baru: Integrasi Buku Transaksi + Kontak Pelanggan

- **Halaman `/customers` (Kontak Pelanggan)**: tabel per kontak — jumlah layanan, tagihan (nilai/admin/outstanding), transaksi kasir terkait, dan total keuntungan per kontak; klik baris = detail riwayat tagihan + struk
- **Tagihan BRILink kini masuk buku transaksi** (2 struk): (1) saat agen kirim via BRILink → struk **Akun BRILink** (nominal tagihan); (2) saat pelanggan bayar → struk **Kas** (nominal tagihan, untung = admin) — kas +total, langsung ikut Data Transaksi, Laporan & Opname
- **Saldo akun akurat**: "Kirim (talangan)" memotong saldo akun sumber (BRILink); "Batal" menghapus kedua struk & membalikkan saldo secara presisi
- **Opname konsisten**: struk pembayaran memakai nominal tagihan + fee admin = total kas masuk, tidak terhitung ganda
- **Data historis dari import aman**: flag `providerApplied`/`cashApplied` memastikan data lama tidak ganda terhitung
- **API**: `/api/bills` menerima `accountId`, PATCH transisi status menangani mutasi uang atomik
- **Filter baru di Data Transaksi**: kategori Tagihan PLN

## [2.2.0] - 2026-10-21

### Baru: Modul Tagihan BRILink

- **Halaman `/tagihan`**: pencatatan pemotongan tagihan pelanggan (PLN, PDAM, BPJS TK, BPJS Kes) via akun agen
- **Kontak pelanggan**: satu kontak bisa punya lebih dari 1 nomor layanan (mis. MTs Muh. Ponjong: PLN + PDAM + BPJS TK)
- **Status alur tagihan**: BELUM (belum dikirim) → TALANGAN (agen bayar dulu, pelanggan hutang) → LUNAS (pelanggan bayar)
- **Import CSV**: paste data buku tagihan langsung dari UI; validasi lengkap server-side (nominal, status, waktu, duplikat) — gagal validasi = tidak ada yang ditulis; import ulang idempoten (tidak ganda)
- **Import CLI**: `prisma/import-bills.mjs` + `prisma/verify-bills.mjs` untuk verifikasi totals
- **Ringkasan**: total tagihan, untung admin, talangan outstanding, terenkani
- **Aksi cepat**: kirim talangan (dari BELUM), tandai pelanggan bayar (ke LUNAS), batal, hapus
- **Model baru**: `Customer`, `CustomerNumber`, `Bill` (unik per bulan+jenis+no pelanggan)
- **API baru**: `/api/bills`, `/api/bills/[id]`, `/api/bills/import`, `/api/customers`

### Perbaikan

- `Input` teks tidak lagi hanya menerima angka (filter digit hanya untuk mode `accounting`)
- Waktu disimpan akurat WIB (UTC+7) dan ditampilkan dalam format Indonesia

### Data Awal

- Import data buku tagihan Oktober 2026: 40 tagihan, 33 kontak, 40 nomor layanan
- Ringkasan: tagihan Rp5.232.767, admin Rp116.280, total Rp5.349.047
- Status: Lunas 23, Talangan 15 (outstanding Rp1.838.059), Belum 2

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
