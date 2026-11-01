import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";
import ClientToaster from "@/components/ClientToaster";
import { getSession } from "@/lib/auth";
import ThemeColorMeta from "@/components/ThemeColorMeta";

export const metadata: Metadata = {
  title: "KasMu — Aplikasi Pembukuan Agen Mini-ATM Offline",
  description: "Aplikasi pembukuan anti selip khusus kemitraan agen mini-ATM (BRILink, BNI Agen46, Mandiri, Fastpay, PPOB) 100% offline.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KasMu",
    startupImage: [
      {
        url: "/apple-touch-icon.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  applicationName: "KasMu",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050507",
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KasMu" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[#050507] text-white flex transition-colors duration-150">
        <ThemeProvider>
          <AppShell initialUser={session}>{children}</AppShell>
          <ClientToaster />
          <ThemeColorMeta />
        </ThemeProvider>
      </body>
    </html>
  );
}
