import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateOpnameTotal,
  calculateOpnameDiscrepancy,
  calculateTransactionImpact,
} from "@/lib/accounting";

export async function GET() {
  try {
    const activeShift = await prisma.shift.findFirst({
      where: { status: "OPEN" },
      orderBy: { startTime: "desc" },
      include: {
        user: true,
        transactions: {
          include: { account: true },
        },
      },
    });

    if (!activeShift) {
      return NextResponse.json({
        success: true,
        hasActiveShift: false,
        message: "Belum ada shift kasir yang aktif",
      });
    }

    // Hitung seluruh mutasi uang tunai fisik sejak buka shift:
    // Modal Awal Kasir
    const initialCash = activeShift.initialCash;

    // Transaksi Tunai:
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalFeeToko = 0;
    let totalAdminBank = 0;

    activeShift.transactions.forEach((tx) => {
      // Struk HUTANG belum menerima uang fisik — jangan ikut target kas,
      // baru terhitung otomatis setelah pelunasan (status jadi SUCCESS).
      if (tx.status !== "SUCCESS") return;
      totalFeeToko += tx.storeFee;
      totalAdminBank += tx.adminBank;

      const { cashDrawerDelta } = calculateTransactionImpact(
        tx.category,
        tx.amount,
        tx.adminBank,
        tx.storeFee,
        tx.paymentMethod
      );

      if (cashDrawerDelta > 0) {
        totalCashIn += cashDrawerDelta;
      } else if (cashDrawerDelta < 0) {
        totalCashOut += Math.abs(cashDrawerDelta);
      }
    });

    // Mutasi Kas Operasional sejak shift dibuka
    const cashMutations = await prisma.cashMutation.findMany({
      where: {
        createdAt: { gte: activeShift.startTime },
      },
    });

    const otherIncome = cashMutations
      .filter((m) => m.type === "IN")
      .reduce((sum, m) => sum + m.amount, 0);

    const operationalExpenses = cashMutations
      .filter((m) => m.type === "OUT")
      .reduce((sum, m) => sum + m.amount, 0);

    // Target Uang Fisik yang WAJIB ada di laci kasir
    const targetPhysicalCash =
      initialCash + totalCashIn - totalCashOut + otherIncome - operationalExpenses;

    // Accounts balance
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
    });

    // Hutang & Piutang
    const debts = await prisma.debtLoan.findMany({
      where: { status: { not: "PAID" } },
    });
    const totalHutang = debts
      .filter((d) => d.type === "HUTANG")
      .reduce((sum, d) => sum + d.remaining, 0);
    const totalPiutang = debts
      .filter((d) => d.type === "PIUTANG")
      .reduce((sum, d) => sum + d.remaining, 0);

    // P&L Hari Ini (Shift ini)
    const netProfitShift = totalFeeToko - totalAdminBank + otherIncome - operationalExpenses;

    return NextResponse.json({
      success: true,
      hasActiveShift: true,
      data: {
        shiftId: activeShift.id,
        kasirName: activeShift.user.name,
        startTime: activeShift.startTime,
        initialCash,
        targetPhysicalCash,
        pnl: {
          totalFeeToko,
          totalAdminBank,
          otherIncome,
          operationalExpenses,
          netProfitShift,
        },
        accounts,
        totalHutang,
        totalPiutang,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shiftId, sheets, notes, closeShift = false } = body;

    if (!shiftId || !Array.isArray(sheets)) {
      return NextResponse.json(
        { success: false, error: "Shift ID dan rincian lembar uang pecahan wajib diisi" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { transactions: true },
    });

    if (!shift) {
      return NextResponse.json({ success: false, error: "Shift tidak ditemukan" }, { status: 404 });
    }

    // Hitung total fisik dari lembar uang
    const totalPhysicalCashCounted = calculateOpnameTotal(sheets);

    // Hitung target fisik sistem
    let totalCashIn = 0;
    let totalCashOut = 0;
    shift.transactions.forEach((tx) => {
      if (tx.status !== "SUCCESS") return;
      const { cashDrawerDelta } = calculateTransactionImpact(
        tx.category,
        tx.amount,
        tx.adminBank,
        tx.storeFee,
        tx.paymentMethod
      );
      if (cashDrawerDelta > 0) totalCashIn += cashDrawerDelta;
      if (cashDrawerDelta < 0) totalCashOut += Math.abs(cashDrawerDelta);
    });

    const cashMutations = await prisma.cashMutation.findMany({
      where: { createdAt: { gte: shift.startTime } },
    });
    const otherIncome = cashMutations
      .filter((m) => m.type === "IN")
      .reduce((sum, m) => sum + m.amount, 0);
    const operationalExpenses = cashMutations
      .filter((m) => m.type === "OUT")
      .reduce((sum, m) => sum + m.amount, 0);

    const targetPhysicalCash =
      shift.initialCash + totalCashIn - totalCashOut + otherIncome - operationalExpenses;

    const { discrepancy, status } = calculateOpnameDiscrepancy(
      totalPhysicalCashCounted,
      targetPhysicalCash
    );

    // Simpan rincian opname per pecahan
    await prisma.opnameDetail.deleteMany({ where: { shiftId } });
    await prisma.opnameDetail.createMany({
      data: sheets.map((s: any) => ({
        shiftId,
        denomination: Number(s.denomination),
        sheetCount: Number(s.sheetCount || 0),
        totalAmount: Number(s.denomination) * Number(s.sheetCount || 0),
      })),
    });

    // Update shift data
    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        finalCashTarget: targetPhysicalCash,
        finalCashCounted: totalPhysicalCashCounted,
        discrepancy,
        notes: notes || null,
        status: closeShift ? "CLOSED" : shift.status,
        endTime: closeShift ? new Date() : shift.endTime,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedShift,
        totalPhysicalCashCounted,
        targetPhysicalCash,
        discrepancy,
        status,
      },
      message: closeShift
        ? "Shift berhasil ditutup dan hasil opname tersimpan!"
        : "Rekonsiliasi opname kas berhasil disimpan!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
