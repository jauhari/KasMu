# KasMu — Aplikasi Pembukuan Agen Mini-ATM Offline

Aplikasi pembukuan operasional dan finansial anti-selip khusus kemitraan agen mini-ATM (Agen BRILink, BNI Agen46, Mandiri Agen, Fastpay, PPOB, Pulsa, & E-Wallet).

100% Offline — Data tersimpan aman di perangkat lokal menggunakan SQLite.

## Fitur Utama
1. **Input Transaksi Cepat (3 Detik)**:
   - Form input pintar dengan shortcut keyboard `F2`.
   - Auto kalkulasi profit bersih: `Fee Toko - Admin Bank`.
   - Update saldo provider (BRImo, Livin, DANA, dll) secara instan & validasi saldo cukup.
   - Cetak struk thermal printer (58mm/80mm format).
2. **Opname Cash & Rekonsiliasi Brankas (Anti-Selisih)**:
   - Kalkulator pecahan lembar uang fisik (Rp 100k, 50k, 20k, 10k, 5k, 2k, 1k, 500).
   - Bandingkan uang fisik riil vs target saldo sistem secara otomatis.
   - Deteksi selisih instan (+ Lebih / - Kurang / Cocok).
3. **Multi-Akun Saldo Provider**:
   - Pantau modal perbankan & e-wallet dalam satu layar lengkap dengan visual donat.
4. **Sistem Shift Kasir & Audit Performa**:
   - Buka shift dengan modal awal -> operasional -> tutup shift wajib opname kas.
5. **Keluar/Masuk Cash & Hutang/Piutang**:
   - Catat biaya operasional toko (kertas struk, makan kasir, listrik).
   - Catat talangan / kasbon nasabah dan pelunasan.
6. **Laporan Keuangan & Ekspor**:
   - Laba rugi otomatis (P&L).
   - Ekspor laporan ke PDF dan Excel (.xlsx) dengan 1-klik.
7. **Backup & Restore 100% Offline**:
   - Simpan dan pulihkan database tanpa butuh internet.

---

## Cara Menjalankan Aplikasi

```bash
# 1. Jalankan development server
npm run dev

# 2. Buka di browser
http://localhost:4000
```

Untuk build production:
```bash
npm run build
npm start
```
