# KasMu - Changelog

## [2.6.5] - 2026-11-09

### Perbaikan UI: Nomor Pelanggan Lebih Stand Out

- Nomor pelanggan di tabel **Kontak Pelanggan** diperbesar, ditebalkan, dan pakai font monospace dengan warna putih.
- Di modal detail kontak, nomor pelanggan ditampilkan dalam kotak tersendiri dengan warna amber yang besar, lengkap dengan tombol salin.
- Icon copy diperbesar agar mudah diklik.

## [2.6.4] - 2026-11-09

### Perbaikan UI: Angka Rupiah Lebih Mudah Dibaca

- Angka-angka rupiah di halaman **Kontak Pelanggan** dan modal detail diperbesar dan ditebalkan.
- Nilai tagihan, untung, talangan, dan transaksi sekarang pakai `font-mono` + warna putih/amber/emerald yang lebih kontras.
- Ukuran font angka di kartu ringkasan modal detail naik dari `text-sm` menjadi `text-lg`.

## [2.6.3] - 2026-11-09

### Perbaikan UX: Pencarian Kontak Pelanggan

- Pencarian di halaman **Kontak Pelanggan** sekarang bisa mencari berdasarkan **nama, nomor pelanggan, atau jenis layanan** (PLN, PDAM, BPJS).
- Penambahan filter dropdown **Semua Layanan / PLN / PDAM / BPJS TK / BPJS Kes**.
- Pencarian berjalan live dengan debounce 300ms.
- Kolom **Layanan** sekarang menampilkan nomor pelanggan di samping jenis layanan, lengkap dengan tombol **salin** nomor.
- API `/api/customers` mendukung parameter `search` dan `jenis`.

## [2.6.2] - 2026-11-04

### Perbaikan UI: Konsistensi Bentuk Square di Sidebar

- Menu navigasi sidebar (desktop & mobile drawer) sekarang kotak / square (`rounded-none`), tidak lagi rounded-xl.
- Badge user di sidebar bawah dan mobile header juga diubah dari rounded-full menjadi square supaya konsisten dengan tema "square boxed".

## [2.6.1] - 2026-11-04

### Perbaikan: Fee Default Otomatis per Kategori

- Form **Input Transaksi Kasir** sekarang otomatis mengisi Fee BRILink & Fee Toko default saat kategori berubah.
- Mapping default:
  - **Listrik (Token PLN / Tagihan PLN)** & **Pulsa/Data**: Fee BRILink 3.000, Fee Toko 3.000
  - **PDAM** & **BPJS**: Fee BRILink 2.500, Fee Toko 3.000
  - **Transfer Bank (sesama BRI)**: Fee BRILink 5.000, Fee Toko 0
  - **Setor Tunai**: Fee BRILink 2.500, Fee Toko 10.000
  - **Tarik Tunai**: Fee BRILink 0, Fee Toko 5.000
  - **Topup E-Wallet**: Fee BRILink 500, Fee Toko 3.000
- Nilai fee tetap bisa diedit manual setelah kategori dipilih.

## [2.6.0] - 2026-11-04

### Fitur Baru: Foto Struk + OCR AI

- Tombol **"Foto Struk"** di modal **Tambah Tagihan** dan **Input Transaksi Kasir**.
- Foto struk diupload ke server, dibaca oleh AI Vision (Google Gemini 1.5 Flash), lalu form terisi otomatis.
- Data struk disimpan sebagai **file di `public/uploads/struk/`**, bukan base64 di database.
- Field tambahan hasil OCR (tarif/daya, stand meter, periode, no ref, dll.) disimpan di kolom `receiptDetails` (JSON).
- Path foto struk disimpan di kolom `receiptImage` pada tabel `Bill` dan `Transaction`.
- Hasil OCR tetap bisa dikoreksi manual sebelum disimpan.
- URL foto struk bisa dibuka langsung (di-whitelist dari auth middleware) sehingga bisa dilihat dari HP lain.

## [2.5.6] - 2026-11-04

### Perbaikan UX: Pencarian Cerdas & Tombol Salin

- **Pencarian transaksi sekarang live (AJAX debounce 300ms)** — hasil muncul sambil mengetik, tidak perlu tekan tombol Cari.
- **Tombol salin nomor** muncul di kolom Nasabah / Referensi setiap baris transaksi. Klik icon copy untuk menyalin `customerRef` (no pelanggan / no HP / no rekening) ke clipboard.

## [2.5.5] - 2026-11-03

### Perubahan Besar: Model Fee BRILink & Cashback

- **Fee BRILink** sekarang adalah fee yang ditagih ke nasabah, bukan biaya bank yang mengurangi laba.
- **Total bayar nasabah** = Nominal + Fee BRILink + Fee Toko.
- **Saldo rekening/provider berkurang** = Nominal + Fee BRILink (dipotong bank).
- **Cashback BRILink** = 50% dari Fee BRILink, masuk ke rekening BRILink di periode tertentu.
- **Estimasi Laba Bersih** = Fee Toko + Cashback BRILink (50%).
- Form transaksi kini menampilkan rincian: Fee Toko (kas), Cashback BRILink, Estimasi Laba Bersih.
- Tombol **"Cashback"** di daftar transaksi untuk merealisasikan komisi BRILink ke saldo rekening saat bank sudah mengirim.
- Laporan & opname menghitung laba dari `netProfit` transaksi; mutasi "Cashback BRILink" dikecualikan dari otherIncome agar tidak double-count.

## [2.5.4] - 2026-11-02

### Perbaikan

- **Tampilan estimasi laba di form transaksi** sekarang benar menunjukkan tanda negatif (rugi) dan warna merah saat `Fee Toko < Admin Bank`. Sebelumnya selalu ditambahkan prefix `+`, sehingga rugi Rp 1.000 tampak seperti `+-Rp 1.000`.

## [2.5.3] - 2026-11-02

### Baru: Mode Aplikasi & Warna Browser

- **Web App Manifest** (`public/manifest.json`) — aplikasi bisa "Add to Home Screen" dan berjalan **standalone** (tanpa address bar/toolbar browser), orientasi portrait, tema gelap.
- **Apple mobile-web-app meta** ditambahkan: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style="black-translucent"`, `apple-mobile-web-app-title="KasMu"`.
- **Touch icon** `apple-touch-icon.png` dibuat dari icon SVG resmi (180×180 px).
- **Theme color** browser/status bar menyesuaikan tema aktif: gelap `#050507`, terang `#fafafa` via komponen `ThemeColorMeta`.
- **Viewport** diperbarui `viewport-fit=cover` agar aplikasi memenuhi layar poni/notch.

## [2.5.2] - 2026-10-31

### Perbaikan: Habis-habisan Native Browser Controls

- **Tidak ada lagi `confirm()`, `alert()`, `prompt()`** di seluruh aplikasi
  - Hapus tagihan di **Data Transaksi → Tagihan Pelanggan** pakai modal `ConfirmDialog` kustom
  - Restore backup di halaman **Backup & Restore** pakai modal konfirmasi kustom + tombol "Mulai Pemulihan" terpisah
  - Tutup shift di **Opname / Tutup Kasir** pakai modal konfirmasi kustom
- **`<textarea>` bawaan browser diganti** komponen `Textarea` sendiri (impor CSV di Tagihan)
- **Input tersembunyi di login dihapus** — PIN & userId sekarang murni React state; fallback pre-hydration keypad tetap bekerja tanpa DOM `<input>`
- **File picker di backup tetap diakses via tombol kustom** — input file native disembunyikan, pengguna tidak pernah melihat kontrol bawaan browser

## [2.5.1] - 2026-10-24

### Baru: DateTimePicker Kustom

- **Tanggal & jam pakai picker buatan sendiri** — tampilan kalender panel gelap, aksen amber, font mono, lingkaran tidak bulat (rounded-none). Sesuai RULE: tidak ada lagi elemen bawaan browser (`datetime-local` native dihapus total)
- Terpasang di: Form Input Transaksi Kasir, Tandai Lunas (Struk & Tagihan)
- Tombol **NOW** — set tanggal + jam ke waktu sekarang dengan 1 klik
- Navigasi bulan ◀ ▶, penanda hari ini (bingkai hijau), dan dropdown jam/menit scrollable dalam panel

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
