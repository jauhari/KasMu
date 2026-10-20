import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { startTime: "desc" },
      include: {
        user: true,
        _count: { select: { transactions: true } },
      },
      take: 50,
    });
    return NextResponse.json({ success: true, data: shifts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, initialCash = 0 } = body;

    // Check if there is already an open shift
    const existing = await prisma.shift.findFirst({
      where: { status: "OPEN" },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Masih ada shift yang aktif/terbuka. Silakan tutup shift sebelumnya terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    const shift = await prisma.shift.create({
      data: {
        userId: user.id,
        initialCash: Number(initialCash),
        status: "OPEN",
      },
      include: { user: true },
    });

    return NextResponse.json({
      success: true,
      data: shift,
      message: "Shift kasir baru berhasil dibuka!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
