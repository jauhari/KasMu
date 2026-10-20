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

    const newRemaining = Math.max(0, record.remaining - Number(paymentAmount));
    const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

    const updated = await prisma.debtLoan.update({
      where: { id },
      data: {
        remaining: newRemaining,
        status: newStatus,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
