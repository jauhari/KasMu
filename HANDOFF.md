# HANDOFF — KasMu

Dokumen penyerahan kondisi proyek per **31 Oktober 2026**. Baca ini sebelum melanjutkan pekerjaan apa pun.

## 1. Gambaran Umum

- **Aplikasi**: KasMu — pembukuan mini-ATM/BRILink (Next.js App Router + Prisma + SQLite), UI custom anti-slop (bukan library komponen).
- **Repo lokal**: `C:\Users\RYZEN\Projects\KasMu` (branch `master`, **tanpa remote** — deploy via SSH/SCP).
- **Server produksi**: MacBook Air user, `dhw@100.78.120.29`, app di `/Users/dhw/sites/kasmu.jauhari.net`, port `127.0.0.1:4000`.
- ** NEXT dalam repo** tidak ada; jangan guess URL deploy.

## 2. Deployment (cara pasti)

```powershell
# PowerShell (Windows dev), kunci SSH:
scp -i "$env:USERPROFILE\.ssh\id_ed25519_macbook_server" -r src/. dhw@100.78.120.29:/Users/dhw/sites/kasmu.jauhari.net/src/
scp -i "$env:USERPROFILE\.ssh\id_ed25519_macbook_server" prisma/schema.prisma CHANGELOG.md dhw@100.78.120.29:/Users/dhw/sites/kasmu.jauhari.net/prisma/
```

Rebuild + restart di server:

```bash
ssh -i "$env:USERPROFILE\.ssh\id_ed25519_macbook_server" dhw@100.78.120.29 \
  "export PATH=/Users/dhw/.local/node-22/bin:/usr/bin:/bin:/usr/sbin:/sbin && \
   cd /Users/dhw/sites/kasmu.jauhari.net && \
   npm run build 2>&1 | tail -2 && \
   launchctl unload ~/Library/LaunchAgents/com.kasmu.server.plist; sleep 2; \
   launchctl load ~/Library/LaunchAgents/com.kasmu.server.plist; sleep 12; \
   curl -s -o /dev/null -w 'login: %{http_code}\n' http://127.0.0.1:4000/login"
```

- Verifikasi: `/login` = 200; halaman auth (`/transaksi`, `/customers`, `/tagihan`) = 307 diarahkan login (middleware auth bekerja).
- node dari `/Users/dhw/.local/node-22/bin` — selalu export PATH.
- `prisma db push` di server bila schema berubah (additive aman; lihat catatan SQLite di bagian 6).

## 3. Keadaan Data Server (per 21 Okt 2026)

- DB asli = **`prisma/kasmu.db`** (schema `file:./kasmu.db` resolusinya relatif terhadap folder prisma). File `kasmu.db` & `prisma/dev.db` di root server adalah sampah 0-byte, boleh dihapus.
- **Users**: owner PIN `123456`, kasir1 PIN `112233` — dipertahankan lewat reset.
- **Akun**: BRILink (BANK, saldo = **−5.232.767** lihat catatan), BukuWarung (BANK, 0), Kasir (CASH_DRAWER, saldo = **3.510.988**).
- **40 tagihan** hasil import CSV Oktober 2026 (data minggu berjalan, BUKAN riwayat lama): LUNAS=23, TALANGAN=15 (outstanding 1.838.059), BELUM=2. Sum: tagihan 5.232.767, admin 116.280, total 5.349.047 — terverifikasi sama persis CSV.
- **61 struk** otomatis dari tagihan: 38 `KIRIM-*` (TRANSFER, Akun BRILink, untung 0) + 23 `BYR-*` (CASH, Akun Kasir, untung = admin). **Untung umum yang diakui = 72.780** (admin LUNAS saja — laporan tidak menghitung tagihan talangan).
- Tanggal struk mencerminkan tanggal CSV (parse `+07:00` WIB).
- **Kenapa BRILink minus 5.232.767**: baru tagihan tercatat; uang tarik tunai nasabah (pengisi saldo BRILink riil) belum dicatat. User harus menyesuaikan saldo BRILink ke saldo nyata lewat Saldo Akun → edit, atau mencatat tarik tunai lama via Data Transaksi.

## 4. Model Uang Tagihan (inti sistem)

Satu tagihan = 2 struk, dijaga flag `providerApplied`/`cashApplied` di Bill:

| Kejadian | Saldo | Struk |
|---|---|---|
| Kirim (kirim/talangan) | Akun sumber (BRILink) −tagihan | `KIRIM-<J>-<noPel>-<bulan>` TRANSFER, storeFee 0, netProfit 0 |
| Pelanggan bayar (lunas) | Kasir +total | `BYR-...` CASH, storeFee=admin, netProfit=admin |
| Batal / hapus | `revertBillMoney` membalik saldo + hapus kedua struk | — |

- Untung diakui SAAT PELANGGAN BAYAR (baris KIRIM menampilkan tulisan "admin RpX saat pelanggan bayar", badge Talangan kuning). Pilihan sadar: laporan = uang yang benar-benar masuk.
- **Data historis aman**: flag false = tidak mutasi. Re-import idempoten (upsert by `@@unique bill [bulan, jenis, noPelanggan]`, struk nomor deterministik, skip flag true — sudah diuji: 0 ganda).
- Import (API `/api/bills/import` & script `prisma/import-bills.mjs`) **langsung** menerapkan uang+struk bila akun ada: sumber = akun bernama mengandung "brilink" (fallback BANK pertama); kas = akun `CASH_DRAWER`.
- Nominal `Transaction.billId` TIDAK lagi unik (2 struk per bill). Index unik lama sudah di-DROP manual di server — **di SQLite, `prisma db push` bisa gagal menghapus index unik**; cek `sqlite_master` bila error "Unique constraint failed on billId" muncul lagi (`prisma/fix-unique.mjs` mungkin perlu dibuat ulang).
- Opname: target kas dihitung dari struk `calculateTransactionImpact` (CASH). Struk tagihan memakai nominal TAGIHAN + storeFee=admin = total ⇒ konsisten, tidak dobel.

## 5. Halaman & Navigasi (final)

- Sidebar **satu menu** "Data Transaksi" (`/transaksi`) berisi **tab**: Struk Kasir (daftar struk + Transaksi Baru F2) & Tagihan Pelanggan (kontrol CSV import, kirim/lunas/batal, filter periode).
- `/tagihan` sekarang `redirect('/transaksi?tab=tagihan')`.
- `src/components/TagihanSection.tsx` = isi tab tagihan (tanpa Header sendiri).
- Menu lain: Dashboard, Kontak Pelanggan (`/customers` — agregat value/profit per kontak + detail modal), Opname, Saldo Akun, Keluar/Masuk Cash, Hutang/Piutang, Laporan, Staff, Backup.
- API tagihan: `/api/bills` (GET/POST — GET dukung `customerId`; POST menerapkan uang hanya utk tagihan baru, default akun sumber otomatis), `/api/bills/[id]` (PATCH transisi status → helper uang; guard: edit nominal ditolak selagi uang sudah termutasi; DELETE revert dulu), `/api/customers` (agregat, tx dicocokkan via nama persis `customerName`).

## 6. Gotchas Teknis (Windows dev PowerShell)

- Tidak ada `&&` (pakai `;` / `if ($?)`), tidak ada `<` redirect, nested quote mematikan → **jangan inline `node -e` berat**; tulis script `.mjs` (lihat pola `prisma/*.mjs`), scp, jalankan di server, hapus.
- `sqlite3` tidak tersedia; cek DB via prisma `$queryRaw` / node script.
- **Struktur server beda dari repo lokal**: repo lokal pakai `src/`, tapi deploy mengirim isi `src/` langsung ke root server (`app/`, `components/`, `lib/` di root). Oleh karena itu `tsconfig.json` di server harus pakai `"@/*": ["./*"]` (bukan `./src/*`). Jangan timpa tsconfig server dengan versi lokal tanpa menyesuaikan paths.
- Selalu `npx tsc --noEmit` lalu `npx next build` sebelum commit/deploy.
- Script mjs dulu sempat ada salah tulis lucu ("MISMAPANTHAN") — sudah dibersihkan; jaga kualitas string.
- **RULE UI (wajib)**: tidak ada elemen bawaan browser yang tampak & tidak ada emoji di UI. `datetime-local` native **dibanned** — pakai `DateTimePicker` kustom (`ui/date-time-picker.tsx`). Dialog konfirmasi bawaan (`confirm`/`alert`/`prompt`) **dibanned** — pakai `ConfirmDialog` kustom (`ui/confirm-dialog.tsx`). `<textarea>` bawaan **dibanned** — pakai `Textarea` kustom (`ui/textarea.tsx`). File picker boleh pakai `<input type="file">` asalkan **tersembunyi** dan dipicu tombol kustom. Emoji diganti icon lucide (contoh kasus: 🔍 → RefreshCw).
- **Foto struk / OCR** (v2.6.0): file struk disimpan di `public/uploads/struk/`, di-whitelist di `middleware.ts`. OCR pakai Google Gemini 1.5 Flash via `GOOGLE_API_KEY`. Hasil OCR mengisi form di modal tagihan & transaksi kasir; field ekstra masuk `receiptDetails` JSON. Pastikan `GOOGLE_API_KEY` ter-set di environment server (LaunchAgent plist) sebelum deploy.
- **PWA / tampilan home screen**: manifest di `public/manifest.json` (display `standalone`, theme/background `#050507`). Meta Apple web-app-capable + status-bar-style `black-translucent`. Icon PWA = `public/icon.svg` & `public/apple-touch-icon.png`. Theme color browser menyesuaikan tema aktif via `ThemeColorMeta` (`#050507` dark / `#fafafa` light). Viewport pakai `viewport-fit=cover` agar layar poni penuh. Kontrak komponen dasar:
  - `Input` `accounting` = **controlled** & selalu tampil berformat titik ribuan (termasuk saat mengetik); state nilai = **digit mentah tanpa titik**; backspace di depan titik di-handle manual. Tipe `"datetime-local"` sudah dihapus dari InputProps.
  - `Modal` = klik-keluar ditangani di **kontainer overlay** (`target === currentTarget`) + `stopPropagation` di panel; TIDAK ada layer backdrop terpisah (layer terpisah pernah salah tumpuk → modal close sendiri). Panel wajib `relative` di atas overlay. Ukuran tambahan `"2xl"`.
  - `Select` = klik opsi **wajib `stopPropagation`** — opsi di dalam field yang menerima toggle `onClick`; tanpa itu dropdown tertutup lalu terbuka lagi (pernah jadi bug).
  - `ConfirmDialog` = modal konfirmasi reusable dengan props `title`, `description`, `onConfirm`, `onClose`, `danger` (merah).
  - `Textarea` = `<textarea>` yang distyle seragam dengan Input (bg gelap, border slate, focus amber, resize-none).
- Palet grafik dashboard (`DashboardClient`): `PIE_COLORS` amber-first, fallback mengganti warna legacy default `#2563eb` (dianggap "belum ditata"); tooltip ikut `tooltipStyle()` (rounded-none, mono). Line chart stroke amber `#f59e0b`.
- **Model HUTANG transaksi kasir** (status baru): `Transaction.status = "HUTANG"` → struk HUTANG di-exclude dari opname (filter `status === "SUCCESS"` di 2 tempat), laporan & dashboard otomatis aman. Saat membuat: validasi nama nasabah wajib + tolak TARIK_TUNAI; `netProfit` ditulis 0; dibuat `DebtLoan PIUTANG` amount = amount + storeFee, `notes` memuat anchor **`Kasir TX:<txNumber>`** (jangan dirusak formatnya). Pelunasan via `PUT /api/debt-loans`: bayar parsial → CashMutation IN (untuk struk CASH jangan catat CashMutation — nanti dobel dengan cashDelta saat status jadi SUCCESS); lunas penuh → tx di-PUT jadi SUCCESS + netProfit = storeFee − adminBank.
- **Model Fee BRILink / Cashback** (v2.5.5): label "Admin Bank" berganti **"Fee BRILink"**. Total bayar nasabah = `amount + adminBank + storeFee`. Rekening provider berkurang = `amount + adminBank`. Cashback BRILink = `adminBank × 50%`, masuk rekening BRILink di kemudian hari. `netProfit` = `storeFee + (adminBank × 0.5)`. Tombol **Cashback** di `/transaksi` merealisasikan komisi ke saldo rekening (membuat `CashMutation` kategori `Cashback BRILink` yang dikecualikan dari otherIncome agar laba tidak double-count). Data lama tetap pakai `netProfit` tersimpan, tidak dihitung ulang.
- **Form transaksi**: field `totalCollected` (Total Diterima) otomatis menghitung `storeFee = total − amount − adminBank` (effect; masih teraktif selama field terisi). Field `tanggal` ditolak jika di masa depan (+5 menit toleransi).
- **`/api/version`** membaca `CHANGELOG.md` **saat runtime** (fs) → menambah rilis baru cukup scp CHANGELOG.md, tidak perlu restart. Halaman `/perubahan` (Log Perubahan) menampilkan versi server + waktu build (`fs.stat .next/BUILD_ID`, dikonversi WIB) + seluruh riwayat rilis. Dipakai user untuk pantau deployment.

## 7. Commit Penting (terbaru dulu)

### Sesi 11 Nov 2026 — rilis v2.7.3 (sudah di server)

- `v2.7.3` ux: toolbar kontak dirapikan — filter sejajar, kartu total untung dipisah baris sendiri

### Sesi 11 Nov 2026 — rilis v2.7.2 (sudah di server)

- `v2.7.2` ux: tombol Kelola eksplisit di setiap baris kontak untuk buka detail

### Sesi 11 Nov 2026 — rilis v2.7.1 (sudah di server)

- `v2.7.1` ux: modal detail kontak dirapikan — nomor layanan jadi section sendiri, tombol + Tambah Nomor selalu terlihat

### Sesi 9 Nov 2026 — rilis v2.7.0 (sudah di server)

- `v2.7.0` fitur: tambah kontak & tambah nomor layanan di halaman kontak pelanggan

### Sesi 9 Nov 2026 — rilis v2.6.5 (sudah di server)

- `v2.6.5` ui: nomor pelanggan di halaman kontak & modal detail dibuat lebih stand out dengan copy button

### Sesi 9 Nov 2026 — rilis v2.6.4 (sudah di server)

- `v2.6.4` ui: angka rupiah di halaman kontak & modal detail diperbesar/ditebalkan untuk kemudahan membaca

### Sesi 9 Nov 2026 — rilis v2.6.3 (sudah di server)

- `v2.6.3` ux: pencarian kontak pelanggan by nama/no/jenis layanan + filter jenis + copy nomor

### Sesi 4 Nov 2026 — rilis v2.6.2 (sudah di server)

- `v2.6.2` ui: sidebar & badge user dibuat square/kotak agar konsisten dengan tema square boxed

### Sesi 4 Nov 2026 — rilis v2.6.1 (sudah di server)

- `v2.6.1` ux: fee default otomatis per kategori di transaksi kasir

### Sesi 4 Nov 2026 — rilis v2.6.0 (sudah di server)

- `v2.6.0` fitur: foto struk + OCR AI (Gemini 1.5 Flash) untuk tagihan & transaksi kasir, file struk di `uploads/struk/`

### Sesi 4 Nov 2026 — rilis v2.5.6 (sudah di server)

- `v2.5.6` ux: pencarian transaksi live AJAX debounce + tombol salin nomor referensi

### Sesi 3 Nov 2026 — rilis v2.5.5 (sudah di server)

- `v2.5.5` refactor: model fee BRILink + cashback 50% — laba = fee toko + cashback BRILink, total bayar = nominal + fee BRILink + fee toko, tombol realisasi cashback

### Sesi 2 Nov 2026 — rilis v2.5.4 (sudah di server)

- `v2.5.4` fix: format estimasi laba di form transaksi — tampil negatif/merah saat fee toko lebih kecil dari admin bank

### Sesi 2 Nov 2026 — rilis v2.5.3 (sudah di server)

- `v2.5.3` feat: PWA manifest + theme-color + Apple mobile-web-app meta + touch icon; viewport-fit cover

### Sesi 31 Okt 2026 — rilis v2.5.2 (sudah di server)

- `v2.5.2` refactor: hapus semua native browser controls (`confirm`/`alert`/`prompt`, `<textarea>` bawaan, hidden inputs login) — ganti `ConfirmDialog`, `Textarea`, React state

### Sesi 24 Okt 2026 — rilis v2.5.x (semua sudah di server)

- `2cf5451` feat: koreksi saldo tampil otomatis saat ketik saldo baru
- `a154200` ui: trigger tanggal ringkas (24 Okt 2026 · 08:26) + truncate
- `5814527` ui: label akun provider dipendekkan supaya muat di kolom
- `64e6f5f` ui: modal transaksi satu layar tanpa scroll (2 kolom rapat); hapus tipe datetime-local dari Input
- `8f1ce38` ui: tooltip & stroke grafik dashboard ikut tema (rounded-none, panel mono, tanpa outline putih)
- `5c47452` fix: klik opsi Select bubble ke toggle — dropdown tidak kolaps
- `66b54b6` feat: custom DateTimePicker — banned native picker bawaan browser
- `f44b63d` feat: fee otomatis, transaksi hutang, tanggal transaksi; fix: modal auto-close, titik ribuan konsisten; feat: halaman Log Perubahan + API /api/version

### Sebelumnya

- `ec8dd4f` chore: buang script cek sementara
- `37afa22` refactor: Data Transaksi jadi satu buku — tab Struk Kasir & Tagihan Pelanggan
- `4c12de8` feat: baris struk kirim tampilkan admin tagihan + status talangan (dipackage dengan build terakhir)
- `93313ea` feat: import/CSV tagihan langsung jadi struk + saldo otomatis (idempoten)
- `4eb64ed` refactor: tagihan 2 struk (kirim=BRILink, bayar=Kas+admin), opname konsisten
- `8bbd951` feat: integrasi tagihan ke buku transaksi + halaman Kontak Pelanggan
- `4695a7f` feat: modul Tagihan BRILink + import CSV
- `16cd31b` fix: Input digits-only hanya saat prop `accounting`, syncInput tak blank, inputMode kondisional
- `8a97b54` fix: seed.mjs dobel `main()`

## 8. Langkah Lanjut (belum dikerjakan)

1. **User menyesuaikan saldo BRILink** ke nilai riil di Saldo Akun — sekarang makin gampang: modal koreksi menampilkan selisih koreksi otomatis saat mengetik (feat `2cf5451`).
2. **Tarik tunai historis** belum dicatat → bisa dicatat manual via Form Input Transaksi Kasir dengan kategori TARIK_TUNAI + backdate tanggal.
3. **Pelunasan piutang kasir**: UI modal pelunasan sudah dibuat dan validasi backend sudah menolak pelunasan parsial untuk struk CASH (hanya penuh). Perlu diuji user.
4. Cocokkan kontak: pencocokan struk–kontak tetap via nama persis; autocomplete di form transaksi mendarat kontak baru otomatis — sisa kasus lama masih menumpang nama bebas.
5. Backup otomatis: script & plist sudah aktif di server (`scripts/backup.mjs` + `scripts/com.kasmu.backup.plist`). Backup harian pukul 02:00, menyimpan 14 salinan terakhir di `backups/`.
6. DateTimePicker panel & dropdown Select — di layar hp sempit, panel/option list bisa lewat tepi modal; belum terverifikasi di hp, pantau kalau user mulai pakai dari ponsel.
