import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Sesi tidak valid" }, { status: 401 });
    }

    const { id } = await params;

    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (tx.bankCommission <= 0) {
      return NextResponse.json(
        { success: false, error: "Transaksi ini tidak memiliki komisi BRILink" },
        { status: 400 }
      );
    }

    if (tx.bankCommissionRealized) {
      return NextResponse.json(
        { success: false, error: "Cashback BRILink sudah direalisasi sebelumnya" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id },
        data: { bankCommissionRealized: true },
      }),
      prisma.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: tx.bankCommission } },
      }),
      prisma.cashMutation.create({
        data: {
          type: "IN",
          category: "Cashback BRILink",
          amount: tx.bankCommission,
          accountId: tx.accountId,
          notes: `Cashback 50% dari fee BRILink TX ${tx.txNumber}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Cashback BRILink ${tx.bankCommission.toLocaleString("id-ID")} untuk ${tx.txNumber} berhasil direalisasi`,
    });
  } catch (err: any) {
    console.error("realize-commission error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal merealisasi cashback" },
      { status: 500 }
    );
  }
}
