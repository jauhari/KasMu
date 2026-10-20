import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, userId } = body;

    if (!pin) {
      return NextResponse.json(
        { success: false, error: "PIN wajib dimasukkan" },
        { status: 400 }
      );
    }

    // Cari user berdasarkan PIN (dan userId jika spesifik)
    const whereClause: any = { pin, isActive: true };
    if (userId) whereClause.id = userId;

    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "PIN salah atau akun tidak aktif" },
        { status: 401 }
      );
    }

    // Buat token sesi
    const token = await createSessionToken(user, 86400 * 7); // 7 hari

    // Response dengan set cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      message: `Selamat bertugas, ${user.name}!`,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
