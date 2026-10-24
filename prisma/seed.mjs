import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting KasMu data (users preserved)...");

  // Clear ALL data EXCEPT users so login accounts remain intact
  await prisma.bill.deleteMany({});
  await prisma.customerNumber.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.opnameDetail.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.cashMutation.deleteMany({});
  await prisma.debtLoan.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.account.deleteMany({});

  // Ensure default login users exist (create if missing, never delete)
  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    update: { role: "OWNER", isActive: true },
    create: {
      username: "owner",
      name: "Owner Agen Mini-Atm",
      pin: "123456",
      role: "OWNER",
    },
  });

  const kasir = await prisma.user.upsert({
    where: { username: "kasir1" },
    update: { role: "STAFF", isActive: true },
    create: {
      username: "kasir1",
      name: "Kasir Kris Brilink",
      pin: "112233",
      role: "STAFF",
    },
  });

  console.log(`Users preserved: ${owner.username} (${owner.role}), ${kasir.username} (${kasir.role})`);
  console.log("KasMu data reset complete. Database kosong siap diisi data real.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
