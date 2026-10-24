import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromAccountId, toAccountId, amount, note } = body;
    const amt = Number(amount);

    if (!fromAccountId || !toAccountId || !amt || isNaN(amt) || amt <= 0) {
      return NextResponse.json(
        { success: false, error: "Akun asal, tujuan, dan nominal wajib diisi" },
        { status: 400 }
      );
    }
    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { success: false, error: "Akun asal dan tujuan tidak boleh sama" },
        { status: 400 }
      );
    }

    const [from, to] = await Promise.all([
      prisma.account.findUnique({ where: { id: fromAccountId } }),
      prisma.account.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: "Akun tidak ditemukan" },
        { status: 404 }
      );
    }
    if (!from.isActive || !to.isActive) {
      return NextResponse.json(
        { success: false, error: "Akun tidak aktif" },
        { status: 400 }
      );
    }
    if (from.balance < amt) {
      return NextResponse.json(
        {
          success: false,
          error: `Saldo ${from.name} tidak cukup (tersedia ${from.balance.toLocaleString("id-ID")})`,
        },
        { status: 400 }
      );
    }

    const noteSuffix = note ? `: ${note}` : "";
    const ops: any[] = [
      prisma.account.update({
        where: { id: from.id },
        data: { balance: { decrement: amt } },
      }),
      prisma.account.update({
        where: { id: to.id },
        data: { balance: { increment: amt } },
      }),
    ];

    // Laci kasir terlibat? Catat mutasi kas agar target opname tetap konsisten.
    if (from.type === "CASH_DRAWER") {
      ops.push(
        prisma.cashMutation.create({
          data: {
            type: "OUT",
            category: "Transfer Antar Akun",
            amount: amt,
            accountId: to.type === "CASH_DRAWER" ? null : to.id,
            notes: `Kas keluar ke ${to.name}${noteSuffix}`,
          },
        })
      );
    }
    if (to.type === "CASH_DRAWER") {
      ops.push(
        prisma.cashMutation.create({
          data: {
            type: "IN",
            category: "Transfer Antar Akun",
            amount: amt,
            accountId: from.type === "CASH_DRAWER" ? null : from.id,
            notes: `Kas masuk dari ${from.name}${noteSuffix}`,
          },
        })
      );
    }

    await prisma.$transaction(ops);

    return NextResponse.json({
      success: true,
      message: `Transfer ${amt.toLocaleString("id-ID")} dari ${from.name} ke ${to.name} berhasil`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
