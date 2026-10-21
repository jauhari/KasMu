# HANDOFF DOCUMENT: KASMU PRO (MINI-ATM & KEAGENAN OFFLINE)

> **Last Updated:** 2026-10-21 08:48 WIB  
> **Status:** Production Deployed & Verified Live at [https://kasmu.jauhari.net](https://kasmu.jauhari.net)  
> **Repository / Local Root:** `C:\Users\RYZEN\Projects\KasMu`  
> **Server Remote:** `dhw@100.78.120.29` (MacBook Air Server, macOS)  

---

## 1. Project Overview & Architecture

**KasMu PRO** is an offline-first bookkeeping and Point of Sale (POS) application specially engineered for Indonesian **Mini-ATM & Banking Agents** (BRILink, BNI Agen46, Mandiri Agen, Fastpay, PPOB, and E-Wallet top-ups).

### Key Architectural Pillars:
1. **100% Offline Capable & Self-Hosted**: Powered by local SQLite + Prisma ORM. No third-party cloud dependencies required for transaction processing.
2. **Reverse Proxy Deployment**: Served via Next.js standalone process bound to port `4000` on a MacBook Air server, reverse-proxied with SSL termination by Caddy (`8080` / `https`) to the domain `kasmu.jauhari.net`.
3. **Double-Entry Financial Accuracy**: Real-time tracking of cash drawer vs. digital bank balances with audit trails, fee margin calculations, and physical cash opname.
4. **Mobile-First POS Experience**: Custom responsive interface optimized for Android and iOS smartphones with bottom navigation, thumb-reach floating action buttons (FAB), and instant Server-Side Rendering (SSR).
5. **Strict Role-Level Security (Owner vs. Staff)**: Cryptographically secured lock screen with granular data masking to ensure staff never view confidential store profit or master bank balances.

---

## 2. Infrastructure & Deployment Environment

| Component | Specification / Path |
| :--- | :--- |
| **Production URL** | `https://kasmu.jauhari.net` |
| **Server Host** | `dhw@100.78.120.29` (MacBook Air, macOS Darwin) |
| **Server Site Path** | `/Users/dhw/sites/kasmu.jauhari.net` |
| **Node.js Binary** | `/Users/dhw/.local/node-22/bin/node` (Node v22.23.3) |
| **Next.js Port** | `127.0.0.1:4000` |
| **Service Manager** | macOS `launchd` via `~/Library/LaunchAgents/com.kasmu.server.plist` |
| **Server Log File** | `/Users/dhw/sites/kasmu.jauhari.net/kasmu.log` |
| **SSH Authentication** | `ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29` |

---

## 3. Security, Authentication & Role Leveling

### A. Credentials & Access Levels

| Role | User Name | Default PIN | Access Privileges |
| :--- | :--- | :--- | :--- |
| **`OWNER`** | Owner Agen Mini-Atm | `123456` | **Full Store Control**: Profit Hari Ini, Profit Bulanan, Biaya Operasional, Komposisi Saldo Akun (Total Modal Toko), Laporan Keuangan, Manajemen Staff, Backup & Restore. |
| **`STAFF`** | Kasir Kris Brilink | `112233` | **Operational Only**: Transaksi Saya, Volume Transaksi Kasir, Status Kas Laci, Catat Transaksi Baru (F2), Riwayat Transaksi (Fee Jasa), Opname Laci. **Confidential profit, operational cost, and master bank balances are completely hidden.** |

### B. Security Mechanisms
- **Cryptographic Token**: Session cookie `kasmu_session` signed using HMAC-SHA256 (`src/lib/auth.ts`) using the Web Crypto API (`crypto.subtle`), valid for 7 days.
- **Proxy-Aware Middleware (`src/middleware.ts`)**: Reads `x-forwarded-proto` and `x-forwarded-host` from Caddy reverse proxy to guarantee redirection stays on `https://kasmu.jauhari.net/login` without leaking `localhost:4000`.
- **Database-Level Data Masking (`src/lib/dashboard.ts`)**: The backend strips out `netProfit`, `profitToday`, `profitMonth`, `cashMutationToday`, `accounts`, and `chartData` when queried by a user with role `STAFF`. Data is not merely hidden with CSS; it is withheld at the server layer.
- **Keypad Security**: All bypass/cheat buttons have been removed from `LoginForm.tsx`. Authentication requires entering the 6-digit PIN on the interactive on-screen keypad or hardware keyboard.

---

## 4. Mobile-First Interface Architecture

The mobile layout adheres strictly to touch-friendly, mobile-first design principles (`antislop-layoutmobile`):

1. **Sticky Top Header (`h-14 lg:hidden`)**:
   - Branding: `KM KasMu PRO`
   - Active Role Pill: Bright blue `Kasir` or warm amber `Owner`
   - Real-Time Clock: Pre-rendered Indonesian date/time string (eliminates `"Memuat..."` stutter)
   - Quick Theme Toggle: Dark mode / Light mode toggle
   - Off-Canvas Drawer Toggle: Hamburger menu
2. **Off-Canvas Slide Drawer (`Sidebar.tsx`)**:
   - Fixed slide-over drawer with backdrop blur and close `X` button
   - Automatically filters menu links based on role (hiding Saldo, Laporan, Staff, Backup for cashiers)
   - Displays user card with quick Lock Screen (`Kunci`) action
3. **Fixed Bottom Navigation Bar (`h-16 lg:hidden`)**:
   - Left: **Beranda** (Dashboard) & **Transaksi** (Data Transaksi)
   - Center: **Elevated FAB (`+`)** with orange-amber gradient glow for quick transaction entry
   - Right: **Opname** (Hitung Kas Laci) & **Menu** (Opens Drawer)
   - Uses `pb-[max(env(safe-area-inset-bottom),0.35rem)]` for iOS/Android home indicators
4. **Safe Scroll Padding (`pb-28 sm:pb-32`)**:
   - Main container features generous bottom padding so cards and tables are never obscured behind the bottom bar.
5. **Instant Server-Side Rendering (SSR)**:
   - `src/app/page.tsx` executes `getDashboardData()` directly on the server and feeds `initialData` into `DashboardClient.tsx`.
   - Result: **Zero Loading Delay**. The complete dashboard renders on the initial HTML byte with no stuck loading spinners.
6. **Isolated Recharts Mounting**:
   - `ResponsiveContainer` charts in `DashboardClient.tsx` are wrapped with a `mounted` check to prevent hydration mismatch crashes on mobile viewports.

---

## 5. Directory Structure & Key Files

```
c:\Users\RYZEN\Projects\KasMu\
├── prisma/
│   ├── schema.prisma            # SQLite database schema (User, Account, Transaction, CashMutation, Shift, OpnameLog)
│   └── dev.db                   # Production SQLite database file
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # login, logout, me, users endpoints
│   │   │   ├── dashboard/       # Secured role-level dashboard API
│   │   │   ├── transactions/    # CRUD transactions & double-entry balance updates
│   │   │   ├── opname/          # Drawer physical count vs system audits
│   │   │   └── accounts/        # Master bank/provider balance management
│   │   ├── layout.tsx           # Root server layout, injects session into AppShell
│   │   ├── page.tsx             # Root page (SSR getDashboardData + role redirect)
│   │   ├── DashboardClient.tsx  # Dynamic dashboard with role-specific views
│   │   ├── login/               # Secure keypad PIN screen
│   │   ├── transaksi/           # Transaction history & receipts
│   │   ├── opname/              # Physical cash drawer calculation
│   │   ├── saldo/               # Master accounts balance (Owner only)
│   │   ├── mutasi-kas/          # Operational cash flow in/out
│   │   ├── hutang-piutang/      # Receivables & payables ledger
│   │   ├── laporan/             # Comprehensive P&L reports (Owner only)
│   │   ├── staff/               # Staff PIN & accounts management (Owner only)
│   │   └── backup/              # Database backup & restore (Owner only)
│   ├── components/
│   │   ├── AppShell.tsx         # Responsive layout container, top header, bottom bar
│   │   ├── Sidebar.tsx          # Desktop sidebar + Mobile slide-over drawer
│   │   ├── Header.tsx           # Dashboard title, offline badge, live clock
│   │   ├── QuickTransactionModal.tsx # Fast 3-second transaction recording modal
│   │   ├── ReceiptPrinter.tsx   # Bluetooth / 58mm thermal receipt modal
│   │   └── ThemeProvider.tsx    # Dark/light mode theme context
│   ├── lib/
│   │   ├── auth.ts              # HMAC-SHA256 session token generator & verifier
│   │   ├── dashboard.ts         # Server-side dashboard data aggregator with role masking
│   │   ├── prisma.ts            # Prisma client singleton
│   │   └── utils.ts             # Currency formatter (IDR), date helpers
│   └── middleware.ts            # Reverse-proxy aware auth route protection
```

---

## 6. Standard Operating Procedures (Runbook)

### Deploying Changes to Mac Server
1. Copy updated source files from local machine to server:
   ```powershell
   scp -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server -r src/* dhw@100.78.120.29:/Users/dhw/sites/kasmu.jauhari.net/src/
   ```
2. Build and restart service via SSH:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "export PATH=/Users/dhw/.local/node-22/bin:/usr/bin:/bin:/usr/sbin:/sbin && cd /Users/dhw/sites/kasmu.jauhari.net && npm run build && launchctl unload ~/Library/LaunchAgents/com.kasmu.server.plist && sleep 1 && launchctl load ~/Library/LaunchAgents/com.kasmu.server.plist"
   ```
3. Check service health:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "curl -I http://127.0.0.1:4000/login"
   ```
4. View live server logs:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_ed25519_macbook_server dhw@100.78.120.29 "tail -f /Users/dhw/sites/kasmu.jauhari.net/kasmu.log"
   ```

---

## 7. Verification Artifacts & Screenshots

| View Description | Screenshot Artifact Link |
| :--- | :--- |
| **Kasir View (Secured, No Profit Leaks)** | [`mobile_kasir_fixed.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_kasir_fixed.png) |
| **Owner View (Full Financial Dashboard)** | [`mobile_owner_fixed.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_owner_fixed.png) |
| **Slide-Over Drawer Menu** | [`mobile_drawer_verified.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_drawer_verified.png) |
| **Quick Transaction Modal (F2)** | [`mobile_modal_verified.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_modal_verified.png) |
| **Data Transaksi Table** | [`mobile_transaksi_verified.png`](file:///C:/Users/RYZEN/.gemini/antigravity/brain/36f49898-00fb-4305-8d93-55118724d52f/mobile_transaksi_verified.png) |

---

## 8. Suggested Skills for Next Agent
When continuing work on this project, the incoming agent should invoke the following skills:
- **`antislop-layoutmobile`**: Enforces strict touch target boundaries, overflow prevention, and thumb-reach zones.
- **`antislop-ui`**: Prevents generic AI component styling and maintains cohesive micro-typography.
- **`frontend-design`**: Maintains aesthetic consistency for offline banking tools.
- **`verification-before-completion`**: Mandates automated browser / curl verification with screenshot evidence before reporting completion.
