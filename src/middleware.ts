import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Whitelist paths yang boleh diakses tanpa login
  if (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/users"
  ) {
    return NextResponse.next();
  }

  // 2. Baca cookie sesi
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verifikasi keabsahan tanda tangan token
  const session = await verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Sesi telah berakhir atau tidak sah" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sesi valid, teruskan request
  return NextResponse.next();
}
