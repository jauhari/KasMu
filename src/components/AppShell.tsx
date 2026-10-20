"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = !pathname || pathname === "/login" || pathname.startsWith("/login");

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 min-h-screen overflow-y-auto">
        {children}
      </main>
    </>
  );
}
