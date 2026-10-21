import { prisma } from "@/lib/prisma";

export async function getDashboardData(role: string = "OWNER", userId?: string) {
  const isOwner = role === "OWNER";
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

  const countToday = txsToday.length;
  const turnoverToday = txsToday.reduce((sum, tx) => sum + tx.amount, 0);

  // User-specific transactions today (for staff)
  const myTxsToday = userId ? txsToday.filter((t) => t.userId === userId) : txsToday;
  const myCountToday = myTxsToday.length;
  const myTurnoverToday = myTxsToday.reduce((sum, tx) => sum + tx.amount, 0);

  // 2. Latest transactions
  const latestTransactionsRaw = await prisma.transaction.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      account: true,
      user: true,
    },
  });

  // Serialize and filter based on role
  const latestTransactions = latestTransactionsRaw.map((tx) => ({
    ...tx,
    // Staff should NOT see store net profit, only fee customer and transaction amount
    netProfit: isOwner ? tx.netProfit : 0,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    account: tx.account
      ? {
          id: tx.account.id,
          name: tx.account.name,
          type: tx.account.type,
          color: tx.account.color,
          // Staff should NOT see master bank balances
          balance: isOwner ? tx.account.balance : 0,
          createdAt: tx.account.createdAt.toISOString(),
          updatedAt: tx.account.updatedAt.toISOString(),
        }
      : null,
    user: tx.user
      ? {
          id: tx.user.id,
          name: tx.user.name,
          username: tx.user.username,
          role: tx.user.role,
          createdAt: tx.user.createdAt.toISOString(),
          updatedAt: tx.user.updatedAt.toISOString(),
        }
      : null,
  }));

  // If STAFF, return safe staff-level metrics without confidential profit & master modal
  if (!isOwner) {
    return {
      isOwner: false,
      kpi: {
        isOwner: false,
        countToday,
        turnoverToday,
        myCountToday,
        myTurnoverToday,
        drawerStatus: "Siap Operasional",
      },
      latestTransactions,
      accounts: [],
      totalBalance: 0,
      chartData: [],
    };
  }

  // === OWNER ONLY DATA ===
  const profitToday = txsToday.reduce((sum, tx) => sum + tx.netProfit, 0);

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

  // Account Balances Composition
  const accountsRaw = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { balance: "desc" },
  });

  const accounts = accountsRaw.map((acc) => ({
    ...acc,
    createdAt: acc.createdAt.toISOString(),
    updatedAt: acc.updatedAt.toISOString(),
  }));

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Profit growth chart (past 7 days)
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

  return {
    isOwner: true,
    kpi: {
      isOwner: true,
      profitToday,
      profitMonth: profitMonthNet,
      countToday,
      turnoverToday,
      cashMutationToday: netCashMutationToday,
    },
    latestTransactions,
    accounts,
    totalBalance,
    chartData,
  };
}
