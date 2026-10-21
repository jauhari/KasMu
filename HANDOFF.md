# HANDOFF — KasMu

Dokumen penyerahan kondisi proyek per **21 Oktober 2026**. Baca ini sebelum melanjutkan pekerjaan apa pun.

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
- Selalu `npx tsc --noEmit` lalu `npx next build` sebelum commit/deploy.
- Script mjs dulu sempat ada salah tulis lucu ("MISMAPANTHAN") — sudah dibersihkan; jaga kualitas string.

## 7. Commit Penting (terbaru dulu)

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

1. **User menyesuaikan saldo BRILink** ke nilai riil di Saldo Akun (saldo saat ini −5.232.767 karena buku mulai dari nol) — jika perlu, buatkan tombol "Penyesuaian Saldo" yang mencatat mutasi koreksi terstruktur.
2. **Tarik tunai historis** belum dicatat → perlukan input manual atau import kedua.
3. Cek halaman **Laporan Keuangan** terhadap 61 struk (untung 72.780) — belum diuji visual oleh user.
4. Cocokkan kontak: transaksi kasir dikaitkan kontak hanya via nama persis; pertimbangkan pilih kontak saat input struk (user sudah diingatkan).
5. Kolom `mode: "insensitive"` dihapus dari `getBillSourceAccount` (Prisma+SQLite tidak mendukung filter `mode` di versi ini); gantinya fetch aktif BANK/E_WALLET lalu pilih nama mengandung "brilink" secara manual.
6. Bila error "Unique constraint failed on (billId)" muncul lagi: index `Transaction_billId_key` bisa muncul kembali dari `prisma db push`; DROP manual via `$queryRaw` (polanya ada di riwayat commit).
7. Backup API & restore sudah ada — jalankan backup rutin di server.
