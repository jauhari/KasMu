import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.debtLoan.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, partyName, phone, amount, dueDate, notes } = body;

    if (!type || !partyName || !amount) {
      return NextResponse.json(
        { success: false, error: "Tipe, Nama pihak, dan Nominal wajib diisi" },
        { status: 400 }
      );
    }

    const record = await prisma.debtLoan.create({
      data: {
        type,
        partyName,
        phone: phone || null,
        amount: Number(amount),
        remaining: Number(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "UNPAID",
      },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, paymentAmount } = body;

    const record = await prisma.debtLoan.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const pay = Number(paymentAmount) || 0;
    if (pay <= 0 || pay > record.remaining) {
      return NextResponse.json(
        { success: false, error: `Nominal bayar tidak valid (sisa: Rp ${record.remaining.toLocaleString("id-ID")})` },
        { status: 400 }
      );
    }

    const newRemaining = Math.max(0, record.remaining - pay);
    const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

    // Pelunasan boleh terhubung ke struk kasir bertanda HUTANG
    // (dibuat dari form Input Transaksi Kasir via notes "Kasir TX:...").
    const linkedNumber = record.notes?.match(/TX:([A-Za-z0-9-]+)/)?.[1];
    const linkedTx = linkedNumber
      ? await prisma.transaction.findUnique({ where: { txNumber: linkedNumber } })
      : null;

    const updated = await prisma.$transaction(async (prismaTx) => {
      // Untuk struk kasir CASH: kas target baru terbentuk saat status
      // transaksi jadi SUCCESS — jangan catat CashMutation biar tak dobel.
      // Untuk piutang biasa (atau struk TRANSFER/QRIS): uang masuk fisik
      // dicatat sebagai mutasi kas agar opname tetap konsisten.
      const isCashKasirHutang = !!linkedTx && linkedTx.paymentMethod === "CASH";
      if (!isCashKasirHutang) {
        await prismaTx.cashMutation.create({
          data: {
            type: "IN",
            category: "Pelunasan Piutang",
            amount: pay,
            notes: `${record.partyName} — pelunasan ${record.type}`,
          },
        });
      }

      if (newRemaining === 0 && linkedTx && linkedTx.status === "HUTANG") {
        await prismaTx.transaction.update({
          where: { id: linkedTx.id },
          data: {
            status: "SUCCESS",
            netProfit: Number((linkedTx.storeFee - linkedTx.adminBank).toFixed(2)),
          },
        });
      }

      return prismaTx.debtLoan.update({
        where: { id },
        data: {
          remaining: newRemaining,
          status: newStatus,
          // Simpan rangkuman pembayaran di catatan
          notes: `${record.notes ? record.notes.split(" | bayar:")[0] : ""} | bayar:+${pay.toLocaleString("id-ID")}`.trim(),
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Pay debt-loan error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
