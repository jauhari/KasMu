import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const groups = await p.customerNumber.groupBy({
    by: ["customerId"],
    _count: { _all: true },
    having: { customerId: { _count: { gt: 1 } } },
  });
  console.log("== KONTAK MULTI-LAYANAN ==");
  for (const g of groups) {
    const c = await p.customer.findUnique({
      where: { id: g.customerId },
      include: { numbers: true, bills: true },
    });
    console.log(
      `[${c.name}] ${c.numbers.map((n) => n.jenis + ":" + n.noPelanggan).join(" | ")} (${c.bills.length} tagihan)`
    );
  }

  console.log("\n== TALANGAN (belum dibayar pelanggan) ==");
  const talangan = await p.bill.findMany({
    where: { status: "TALANGAN" },
    include: { customer: true },
    orderBy: [{ jenis: "asc" }],
  });
  let sum = 0;
  for (const b of talangan) {
    sum += b.total || 0;
    console.log(`${b.jenis} | ${b.customer.name} | ${b.noPelanggan} | ${b.tagihan}+${b.admin}=${b.total} | kirim ${b.providerPaidAt?.toISOString()}`);
  }
  console.log(`TOTAL TALANGAN: ${sum}`);

  console.log("\n== BELUM ==");
  const belum = await p.bill.findMany({ where: { status: "BELUM" }, include: { customer: true } });
  for (const b of belum) {
    console.log(`${b.jenis} | ${b.customer.name} | ${b.noPelanggan}`);
  }

  console.log("\n== CEK BPJS TK (admin 5780) ==");
  const bpjs = await p.bill.findFirst({ where: { jenis: "BPJS TK" }, include: { customer: true } });
  console.log(`${bpjs.customer.name} | ${bpjs.tagihan}+${bpjs.admin}=${bpjs.total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
