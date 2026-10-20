import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "KasMu — Aplikasi Pembukuan Agen Mini-ATM Offline",
  description: "Aplikasi pembukuan anti selip khusus kemitraan agen mini-ATM (BRILink, BNI Agen46, Mandiri, Fastpay, PPOB) 100% offline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex transition-colors duration-150">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
