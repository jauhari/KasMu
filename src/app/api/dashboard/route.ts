import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Transactions today
    const txsToday = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: today },
        status: "SUCCESS",
      },
    });

    const profitToday = txsToday.reduce((sum, tx) => sum + tx.netProfit, 0);
    const countToday = txsToday.length;

    // 2. Operational cash mutations today
    const mutationsToday = await prisma.cashMutation.findMany({
      where: { createdAt: { gte: today } },
    });

    const cashInToday = mutationsToday
      .filter((m) => m.type === "IN")
      .reduce((sum, m) => sum + m.amount, 0);
    const cashOutToday = mutationsToday
      .filter((m) => m.type === "OUT")
      .reduce((sum, m) => sum + m.amount, 0);
    const netCashMutationToday = cashInToday - cashOutToday;

    // 3. Transactions this month
    const txsMonth = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        status: "SUCCESS",
      },
    });
    const profitMonthGross = txsMonth.reduce((sum, tx) => sum + tx.netProfit, 0);

    const mutationsMonth = await prisma.cashMutation.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        type: "OUT",
      },
    });
    const expensesMonth = mutationsMonth.reduce((sum, m) => sum + m.amount, 0);
    const profitMonthNet = profitMonthGross - expensesMonth;

    // 4. Latest transactions
    const latestTransactions = await prisma.transaction.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        account: true,
        user: true,
      },
    });

    // 5. Account Balances Composition
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { balance: "desc" },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // 6. Profit growth chart (past 7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dayTxs = await prisma.transaction.findMany({
        where: {
          createdAt: { gte: d, lt: nextD },
          status: "SUCCESS",
        },
      });

      const dayProfit = dayTxs.reduce((sum, tx) => sum + tx.netProfit, 0);
      const dayLabel = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      chartData.push({
        date: dayLabel,
        profit: dayProfit,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          profitToday,
          profitMonth: profitMonthNet,
          countToday,
          cashMutationToday: netCashMutationToday,
        },
        latestTransactions,
        accounts,
        totalBalance,
        chartData,
      },
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
