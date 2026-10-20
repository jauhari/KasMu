import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding KasMu database...");

  // Clean existing
  await prisma.opnameDetail.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.cashMutation.deleteMany({});
  await prisma.debtLoan.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Users
  const owner = await prisma.user.create({
    data: {
      username: "owner",
      name: "Owner Agen Mini-Atm",
      pin: "123456",
      role: "OWNER",
    },
  });

  const kasir = await prisma.user.create({
    data: {
      username: "kasir1",
      name: "Kasir Kris Brilink",
      pin: "112233",
      role: "STAFF",
    },
  });

  // 2. Provider Accounts
  const bri = await prisma.account.create({
    data: {
      name: "BRILink Test Kasir",
      accountNumber: "0012-01-089234-50-1",
      type: "BANK",
      balance: 38500000,
      color: "#0284c7",
    },
  });

  const dana = await prisma.account.create({
    data: {
      name: "Dana Seko",
      accountNumber: "081234567890",
      type: "EWALLET",
      balance: 7235612,
      color: "#0ea5e9",
    },
  });

  const mandiri = await prisma.account.create({
    data: {
      name: "Livin Mandiri Agen",
      accountNumber: "137-00-1298471-2",
      type: "BANK",
      balance: 15000000,
      color: "#d97706",
    },
  });

  // 3. Active Shift
  const shift = await prisma.shift.create({
    data: {
      userId: kasir.id,
      initialCash: 5000000,
      status: "OPEN",
    },
  });

  // 4. Sample Transactions
  await prisma.transaction.createMany({
    data: [
      {
        txNumber: "TX-20261021-0001",
        userId: kasir.id,
        shiftId: shift.id,
        accountId: bri.id,
        category: "SETOR_TUNAI",
        amount: 3510000,
        adminBank: 2500,
        storeFee: 12500,
        netProfit: 10000,
        customerName: "Budi Santoso",
        customerRef: "00210192847250",
        paymentMethod: "CASH",
        status: "SUCCESS",
      },
      {
        txNumber: "TX-20261021-0002",
        userId: kasir.id,
        shiftId: shift.id,
        accountId: dana.id,
        category: "TOPUP_EWALLET",
        amount: 202500,
        adminBank: 500,
        storeFee: 3000,
        netProfit: 2500,
        customerName: "Siti Rahma",
        customerRef: "085811223344",
        paymentMethod: "CASH",
        status: "SUCCESS",
      },
      {
        txNumber: "TX-20261021-0003",
        userId: kasir.id,
        shiftId: shift.id,
        accountId: bri.id,
        category: "TARIK_TUNAI",
        amount: 10000000,
        adminBank: 0,
        storeFee: 35000,
        netProfit: 35000,
        customerName: "Pak Haji Ahmad",
        customerRef: "ATM BRI Chip",
        paymentMethod: "CASH",
        status: "SUCCESS",
      },
      {
        txNumber: "TX-20261021-0004",
        userId: kasir.id,
        shiftId: shift.id,
        accountId: dana.id,
        category: "TOPUP_EWALLET",
        amount: 68000,
        adminBank: 0,
        storeFee: 3000,
        netProfit: 3000,
        customerName: "Rian",
        customerRef: "081999887766",
        paymentMethod: "CASH",
        status: "SUCCESS",
      },
    ],
  });

  // 5. Cash Mutation (Operational)
  await prisma.cashMutation.create({
    data: {
      type: "OUT",
      category: "Kertas Struk & Makan Kasir",
      amount: 99000,
      notes: "Beli kertas thermal 5 rol + makan siang kasir",
    },
  });

  console.log("KasMu database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
