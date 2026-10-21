import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let pin: string | null = null;
    let userId: string | null = null;
    let fromUrl: string = "/";
    let isFormRequest = false;

    // Helper untuk redirect absolut aman di balik reverse proxy (Caddy / Cloudflare)
    const getRedirectUrl = (targetPath: string) => {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "kasmu.jauhari.net";
      const cleanPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
      return new URL(cleanPath, `${proto}://${host}`);
    };

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const body = await req.json();
        pin = body?.pin ? String(body.pin).trim() : null;
        userId = body?.userId ? String(body.userId).trim() : null;
        fromUrl = body?.from || "/";
      } catch (err) {
        console.warn("Could not parse json body:", err);
      }
    } else {
      isFormRequest = true;
      try {
        const formData = await req.formData();
        pin = formData.get("pin")?.toString().trim() || null;
        userId = formData.get("userId")?.toString().trim() || null;
        fromUrl = formData.get("from")?.toString().trim() || "/";
      } catch {
        const text = await req.text();
        const params = new URLSearchParams(text);
        pin = params.get("pin")?.trim() || null;
        userId = params.get("userId")?.trim() || null;
        fromUrl = params.get("from")?.trim() || "/";
      }
    }

    if (!pin) {
      if (isFormRequest) {
        return NextResponse.redirect(getRedirectUrl(`/login?error=pin_required`), 303);
      }
      return NextResponse.json(
        { success: false, error: "PIN wajib dimasukkan" },
        { status: 400 }
      );
    }

    // Cari user berdasarkan PIN (dan userId jika spesifik)
    const whereClause: any = { pin, isActive: true };
    if (userId) {
      whereClause.id = userId;
    }

    let user = await prisma.user.findFirst({
      where: whereClause,
    });

    // Fallback pencocokan jika PIN valid untuk user aktif manapun
    if (!user) {
      user = await prisma.user.findFirst({
        where: { pin, isActive: true },
      });
    }

    if (!user) {
      if (isFormRequest) {
        return NextResponse.redirect(getRedirectUrl(`/login?error=invalid_pin`), 303);
      }
      return NextResponse.json(
        { success: false, error: "PIN salah atau akun tidak terdaftar" },
        { status: 401 }
      );
    }

    // Buat token sesi
    const token = await createSessionToken(user, 86400 * 7); // 7 hari

    const secure = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";

    if (isFormRequest) {
      const redirectRes = NextResponse.redirect(getRedirectUrl(fromUrl || "/"), 303);
      redirectRes.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 86400 * 7,
      });
      return redirectRes;
    }

    // Response JSON
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      message: `Selamat bertugas, ${user.name}!`,
      redirectUrl: fromUrl || "/",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Auth login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal melakukan autentikasi" },
      { status: 500 }
    );
  }
}
