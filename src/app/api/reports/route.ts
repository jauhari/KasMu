import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // "today" | "month" | "year"
    const accountId = searchParams.get("accountId");

    const now = new Date();
    let startDate = new Date();

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const txWhere: any = {
      createdAt: { gte: startDate },
      status: "SUCCESS",
    };
    if (accountId) txWhere.accountId = accountId;

    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      include: { account: true, user: true },
    });

    const totalFeeToko = transactions.reduce((s, t) => s + t.storeFee, 0);
    const totalAdminBank = transactions.reduce((s, t) => s + t.adminBank, 0);
    const totalNominal = transactions.reduce((s, t) => s + t.amount, 0);

    const mutations = await prisma.cashMutation.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const otherIncome = mutations
      .filter((m) => m.type === "IN")
      .reduce((s, m) => s + m.amount, 0);

    const operationalExpenses = mutations
      .filter((m) => m.type === "OUT")
      .reduce((s, m) => s + m.amount, 0);

    const totalPendapatan = totalFeeToko + otherIncome;
    const labaBersih = totalPendapatan - totalAdminBank - operationalExpenses;

    // Breakdown by category
    const categoryBreakdown: Record<string, { count: number; fee: number; profit: number }> = {};
    transactions.forEach((tx) => {
      if (!categoryBreakdown[tx.category]) {
        categoryBreakdown[tx.category] = { count: 0, fee: 0, profit: 0 };
      }
      categoryBreakdown[tx.category].count += 1;
      categoryBreakdown[tx.category].fee += tx.storeFee;
      categoryBreakdown[tx.category].profit += tx.netProfit;
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        txCount: transactions.length,
        totalNominal,
        totalFeeToko,
        totalAdminBank,
        otherIncome,
        totalPendapatan,
        operationalExpenses,
        labaBersih,
        categoryBreakdown,
        transactions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
