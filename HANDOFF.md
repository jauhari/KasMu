# HANDOFF DOCUMENT: KASMU PRO (MINI-ATM & KEAGENAN OFFLINE)

> **Last Updated:** 2026-10-21 09:35 WIB  
> **Status:** Production Deployed & Verified Live at [https://kasmu.jauhari.net](https://kasmu.jauhari.net)  
> **Repository / Local Root:** `C:\Users\RYZEN\Projects\KasMu`  
> **Server Remote:** `dhw@100.78.120.29` (MacBook Air Server, macOS Darwin)  

---

## 1. Project Overview & Architecture

**KasMu PRO** is an offline-first bookkeeping and Point of Sale (POS) application specially engineered for Indonesian **Mini-ATM & Banking Agents** (BRILink, BNI Agen46, Mandiri Agen, Fastpay, PPOB, and E-Wallet top-ups).

### Key Architectural Pillars:
1. **100% Offline Capable & Self-Hosted**: Powered by local SQLite + Prisma ORM. No third-party cloud dependencies required for transaction processing.
2. **Multi-Tenant Reverse Proxy Deployment**: Served via Next.js standalone process bound to port `4000` on a MacBook Air server, reverse-proxied with SSL termination by Caddy (`8080` / `https`) to the domain `kasmu.jauhari.net`.
3. **Double-Entry Financial Accuracy**: Real-time tracking of cash drawer vs. digital bank balances with audit trails, fee margin calculations, and physical cash opname.
4. **Mobile-First POS Experience**: Custom responsive interface optimized for Android and iOS smartphones with bottom navigation, thumb-reach floating action buttons (FAB), and instant Server-Side Rendering (SSR).
5. **Strict Role-Level Security (Owner vs. Staff)**: Cryptographically secured lock screen with granular data masking to ensure staff never view confidential store profit or master bank balances.

---

## 2. Server Infrastructure & Multi-Tenant Setup

Host server adalah sebuah **MacBook Air (Apple Silicon, macOS Darwin)** yang melayani beberapa website dan aplikasi internal secara simultan (*multi-tenant*).

### A. Peta Alokasi Port Server (`100.78.120.29`)

| Port | Service / Aplikasi | Keterangan & Aturan |
| :--- | :--- | :--- |
| **`4000`** | **KasMu PRO (`kasmu.jauhari.net`)** | **Dialokasikan khusus untuk KasMu**. Jangan ubah port ini agar tidak bentrok. |
| **`3000`** | `brilink.jauhari.net` | Aplikasi agen BRILink lain yang sudah berjalan sebelumnya. |
| **`80` / `443`** | Caddy Web Server | Reverse Proxy publik & otomatisasi sertifikat SSL (HTTPS). |
| **`8080`** | Caddy Internal / Cloudflare Tunnel | Port binding Caddy reverse proxy. |
| **`9000`** | PHP-FPM | Menangani backend PHP / Laravel (SIPENDA, ASA, dll). |

### B. Konfigurasi Reverse Proxy Caddy (`/Users/dhw/sites/Caddyfile`)

Caddy bertindak sebagai reverse proxy di depan Next.js KasMu. Konfigurasi aktif di `/Users/dhw/sites/Caddyfile`:

```caddy
# KasMu - POS Kasir & Pembukuan Agen Bank (kasmu.jauhari.net), Next.js di 127.0.0.1:4000
@kasmu host kasmu.jauhari.net
handle @kasmu {
    reverse_proxy 127.0.0.1:4000 {
        header_up Host {host}
        header_up X-Forwarded-Host {host}
        header_up X-Forwarded-Proto https
    }
}
```

> [!IMPORTANT]
> **Pengecualian Cache Statis Caddy**:  
> Domain `kasmu.jauhari.net` sengaja **dikecualikan** dari aturan cache statis 30 hari Caddy (`not host ... kasmu.jauhari.net`). Hal ini krusial agar file script chunk Next.js (`/_next/static/chunks/*`) selalu sinkron setiap kali aplikasi di-build ulang dan tidak menyebabkan chunk-mismatch di browser klien.

### C. Konfigurasi Daemon macOS Launchd (`com.kasmu.server.plist`)

KasMu berjalan di background sebagai service macOS via `launchd`.  
File konfigurasi terletak di: `~/Library/LaunchAgents/com.kasmu.server.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kasmu.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/dhw/.local/node-22/bin/node</string>
        <string>/Users/dhw/sites/kasmu.jauhari.net/node_modules/next/dist/bin/next</string>
        <string>start</string>
        <string>-p</string>
        <string>4000</string>
        <string>-H</string>
        <string>127.0.0.1</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOST</key>
        <string>127.0.0.1</string>
        <key>PORT</key>
        <string>4000</string>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PATH</key>
        <string>/Users/dhw/.local/node-22/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>/Users/dhw/sites/kasmu.jauhari.net</string>
    <key>StandardOutPath</key>
    <string>/Users/dhw/sites/kasmu.jauhari.net/kasmu.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/dhw/sites/kasmu.jauhari.net/kasmu.log</string>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

---

## 3. Catatan Khusus & Masalah Setting Server (Troubleshooting Guide)

Berikut adalah daftar masalah kritis yang pernah terjadi pada setting server Mac dan solusinya:

### 1. Masalah PATH Node.js pada Sesi SSH Non-Interactive
* **Gejala**: Menjalankan perintah remote via SSH seperti `ssh dhw@100.78.120.29 "node -v"` menghasilkan error: `zsh: command not found: node`.
* **Penyebab**: macOS tidak memuat `~/.zshrc` pada sesi SSH non-interactive (tanpa pty). Node.js v22 terpasang di direktori mandiri `/Users/dhw/.local/node-22/bin/node` dan bukan di `/usr/bin/node`.
* **Solusi**: Setiap perintah SSH yang melibatkan Node atau NPM **harus** menyertakan export PATH:
  ```bash
  export PATH=/Users/dhw/.local/node-22/bin:/usr/bin:/bin:/usr/sbin:/sbin && cd /Users/dhw/sites/kasmu.jauhari.net && <perintah>
  ```

### 2. Masalah Redirection Reverse Proxy (Error Lari ke `localhost:4000`)
* **Gejala**: Saat pengguna selesai memasukkan PIN di `https://kasmu.jauhari.net/login`, browser diarahkan ke `http://localhost:4000/` atau `http://127.0.0.1:4000/` yang tidak bisa diakses dari smartphone.
* **Penyebab**: Next.js berjalan di port internal 4000. Metode standar Next.js seperti `NextResponse.redirect(new URL('/', req.url))` membaca `req.url` internal (`127.0.0.1:4000`) alih-alih domain publik.
* **Solusi**: Di `src/middleware.ts` dan `src/app/api/auth/login/route.ts`, URL redirect dibangun secara dinamis menggunakan header reverse proxy yang dikirimkan Caddy:
  ```typescript
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "kasmu.jauhari.net";
  const redirectUrl = new URL(targetPath, `${proto}://${host}`);
  ```

### 3. Masalah Layar Macet *"Memuat data KasMu..."* (Loading Spinner Abadi di HP)
* **Gejala**: Di browser smartphone Android/iPhone, setelah login halaman dashboard hanya menampilkan latar hitam dengan spinner *"Memuat data KasMu..."*.
* **Penyebab**: Sebelumnya data dashboard diambil secara *client-side* via `fetch('/api/dashboard')`. Ketika ada build Next.js baru, chunk hash lama dihapus. Jika smartphone membuka tab lama, terjadi kegagalan muat chunk script (*ChunkLoadError*) sehingga eksekusi `useEffect` terhenti.
* **Solusi**: Mengubah arsitektur menjadi **Server-Side Rendering (SSR)**. Data dashboard diambil langsung di server melalui `src/app/page.tsx` + `src/lib/dashboard.ts` dan disuntikkan ke `DashboardClient`. Browser smartphone langsung menerima HTML yang sudah terisi angka lengkap sejak byte pertama tanpa perlu menunggu JavaScript client.

### 4. Prosedur Restart Service yang Benar (Hindari `killall node`)
* **Peringatan**: **JANGAN PERNAH** menggunakan `killall node` di server Mac ini! Karena ada aplikasi lain yang berjalan di port 3000 (`brilink`), mematikan proses node secara global akan mematikan aplikasi produksi lain.
* **Cara Restart Aman KasMu**:
  Gunakan `launchctl` khusus untuk label `com.kasmu.server`:
  ```bash
  ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "launchctl unload ~/Library/LaunchAgents/com.kasmu.server.plist && sleep 1 && launchctl load ~/Library/LaunchAgents/com.kasmu.server.plist"
  ```

### 5. Penempatan File Upload via SCP
* **Perhatian**: Jangan pernah mengunggah file langsung ke direktori `/Users/dhw/sites/kasmu.jauhari.net/src/` tanpa menentukan subdirektori (`src/components/`, `src/app/`, `src/lib/`). File `.tsx` yang tercecer di root `src/` dapat menyebabkan konflik routing atau error kompilasi Next.js.

---

## 4. Keamanan & Role-Leveling (Owner vs. Kasir)

Aplikasi memiliki pemisahan data yang ketat antara Pemilik Toko (**Owner**) dan Petugas Kasir (**Staff/Kasir**):

| Fitur / Data | Level OWNER (PIN: `123456`) | Level KASIR (PIN: `112233`) |
| :--- | :---: | :---: |
| **Profit Bersih Hari Ini** | Tampil penuh (`Rp 50.500`) | **DISEMBUNYIKAN** |
| **Profit Bersih Bulanan** | Tampil penuh (`-Rp 48.500`) | **DISEMBUNYIKAN** |
| **Biaya Operasional Toko** | Tampil penuh (`-Rp 99.000`) | **DISEMBUNYIKAN** |
| **Total Modal Toko (Bank & Digital)** | Tampil penuh (`Rp 60.735.612`) | **DISEMBUNYIKAN** |
| **Grafik Tren Pertumbuhan Profit** | Tampil (7 Hari / 30 Hari) | **DISEMBUNYIKAN** |
| **Transaksi Saya & Volume** | Tampil | Tampil (Fokus Shift) |
| **Status Kas Laci Toko** | Tampil | Tampil (Normal / Siap) |
| **Tombol Aksi Cepat Kasir** | Form Transaksi Cepat (F2) | Tombol Cepat F2 + Opname Laci |
| **Menu Sidebar** | Semua Menu (Saldo, Laporan, Staff, Backup) | Hanya Dashboard, Transaksi, Opname, Mutasi Kas, Hutang |

> [!NOTE]
> Data rahasia toko tidak hanya disembunyikan menggunakan CSS, melainkan **disaring langsung di level database query** (`src/lib/dashboard.ts`). Jika akun kasir melakukan inspeksi Network DevTools, payload JSON tidak mengandung informasi profit bersih toko maupun saldo bank master.

---

## 5. Standard Operating Procedures (Runbook Deployment)

### Langkah Deploy Update dari Komputer Lokal ke Server Mac:

1. **Transfer File Sumber yang Diperbarui via SCP**:
   ```powershell
   scp -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server -r src/* dhw@100.78.120.29:/Users/dhw/sites/kasmu.jauhari.net/src/
   ```

2. **Kompilasi Ulang Next.js & Restart Service di Mac**:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "export PATH=/Users/dhw/.local/node-22/bin:/usr/bin:/bin:/usr/sbin:/sbin && cd /Users/dhw/sites/kasmu.jauhari.net && npm run build && launchctl unload ~/Library/LaunchAgents/com.kasmu.server.plist && sleep 1 && launchctl load ~/Library/LaunchAgents/com.kasmu.server.plist"
   ```

3. **Verifikasi Status Service**:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "curl -I http://127.0.0.1:4000/login"
   ```

4. **Monitoring Log Server (Jika Terjadi Kendala)**:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "tail -n 50 /Users/dhw/sites/kasmu.jauhari.net/kasmu.log"
   ```

---

## 6. Arsip Screenshot Verifikasi Live

| Tampilan | Tautan File Screenshot |
| :--- | :--- |
| **Tampilan Kasir (Aman, Tanpa Bocor Profit)** | [`mobile_kasir_fixed.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_kasir_fixed.png) |
| **Tampilan Owner (Lengkap dengan Profit & Modal)** | [`mobile_owner_fixed.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_owner_fixed.png) |
| **Menu Drawer Slide-Over** | [`mobile_drawer_verified.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_drawer_verified.png) |
| **Modal Input Transaksi Cepat (F2)** | [`mobile_modal_verified.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_modal_verified.png) |
| **Tabel Riwayat Transaksi** | [`mobile_transaksi_verified.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_transaksi_verified.png) |

---

## 7. Rekomendasi Skill untuk Agent Selanjutnya
- **`antislop-layoutmobile`**: Menjaga integritas tata letak mobile-first, navigasi jempol, dan safe area padding.
- **`antislop-ui`**: Menjaga estetika micro-typography dan komponen antarmuka POS perbankan.
- **`verification-before-completion`**: Memastikan setiap update diuji langsung dengan verifikasi browser/screenshot sebelum menyatakan selesai.
