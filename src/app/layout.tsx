import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";
import ClientToaster from "@/components/ClientToaster";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "KasMu — Aplikasi Pembukuan Agen Mini-ATM Offline",
  description: "Aplikasi pembukuan anti selip khusus kemitraan agen mini-ATM (BRILink, BNI Agen46, Mandiri, Fastpay, PPOB) 100% offline.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('kasmu_theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#050507] text-white flex transition-colors duration-150">
        <ThemeProvider>
          <AppShell initialUser={session}>{children}</AppShell>
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
