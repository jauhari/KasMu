import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const accs = await p.account.findMany({ orderBy: { name: "asc" } });
const total123 = await p.transaction.aggregate({ _count: true, _sum: { netProfit: true, storeFee: true } });
const kirim = await p.transaction.count({ where: { txNumber: { startsWith: "KIRIM" } } });
const bayar = await p.transaction.count({ where: { txNumber: { startsWith: "BYR" } } });
const luns = await p.bill.findMany({ where: { status: "LUNAS" } });
const sumLunasTotal = luns.reduce((s, b) => s + (b.total || 0), 0);
const sumLunasAdmin = luns.reduce((s, b) => s + (b.admin || 0), 0);

console.log("== AKUN ==");
for (const a of accs) console.log(`${a.name}: ${a.balance}`);
console.log(`strak: total=${total123._count} kirim=${kirim} bayar=${bayar}`);
console.log(`untung struk bayar=${total123._sum.storeFee} (harus ${sumLunasAdmin})`);
for (const a of accs) {
  if (a.name.includes("BRILink"))
    console.log(`cek BRILink: ${a.balance} harus = -5232767 → ${a.balance === -5232767 ? "OK" : "SALAH"}`);
  if (a.name.includes("Kasir"))
    console.log(`cek Kasir: ${a.balance} harus = ${sumLunasTotal} → ${a.balance === sumLunasTotal ? "OK" : "SALAH"}`);
}
await p.$disconnect();
