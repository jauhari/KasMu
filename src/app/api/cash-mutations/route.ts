import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const mutations = await prisma.cashMutation.findMany({
      orderBy: { createdAt: "desc" },
      include: { account: true },
      take: 100,
    });
    return NextResponse.json({ success: true, data: mutations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, category, amount, accountId, notes } = body;

    if (!type || !category || !amount) {
      return NextResponse.json(
        { success: false, error: "Tipe, Kategori, dan Nominal mutasi wajib diisi" },
        { status: 400 }
      );
    }

    const mutation = await prisma.cashMutation.create({
      data: {
        type,
        category,
        amount: Number(amount),
        accountId: accountId || null,
        notes: notes || null,
      },
    });

    // Jika terkait akun tertentu, update saldo akun
    if (accountId) {
      const delta = type === "IN" ? Number(amount) : -Number(amount);
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      });
    }

    return NextResponse.json({
      success: true,
      data: mutation,
      message: type === "IN" ? "Pemasukan berhasil dicatat" : "Pengeluaran operasional berhasil dicatat",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
