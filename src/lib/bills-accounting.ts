import { prisma } from "@/lib/prisma";
import { generateTxNumber } from "@/lib/utils";

export function billCategory(jenis: string): string {
  if (jenis === "PLN") return "TAGIHAN_PLN";
  if (jenis === "PDAM") return "TAGIHAN_PDAM";
  if (jenis.startsWith("BPJS")) return "TAGIHAN_BPJS";
  return "LAINNYA";
}

export function billJenisLabel(jenis: string): string {
  return jenis === "BPJS TK"
    ? "BPJS TK"
    : jenis === "BPJS Kes"
      ? "BPJS Kesehatan"
      : jenis;
}

/** Laci kasir utama (tempat uang pelanggan masuk) */
export async function getKasAccount() {
  return prisma.account.findFirst({
    where: { type: "CASH_DRAWER", isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Potong saldo akun provider sebesar tagihan saat agen mengirimkan
 * pembayaran (BRILink dipotong, bukan kas).
 */
export async function applyProviderDeduct(billId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { account: true },
  });
  if (!bill || !bill.accountId || !bill.tagihan) return false;
  if (bill.providerApplied) return false;

  await prisma.$transaction([
    prisma.account.update({
      where: { id: bill.accountId },
      data: { balance: { decrement: bill.tagihan } },
    }),
    prisma.bill.update({
      where: { id: bill.id },
      data: { providerApplied: true },
    }),
  ]);
  return true;
}

/**
 * Pelanggan membayar total (kas +total). Buat struk Transaction
 * agar ikut tercatat di Data Transaksi & Laporan (untung = admin).
 */
export async function applyCashPayment(billId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { customer: true },
  });
  if (!bill || bill.total == null) return false;
  if (bill.cashApplied) return false;

  const kas = await getKasAccount();
  if (!kas) throw new Error("Akun Laci Kasir (CASH_DRAWER) belum ada — tambahkan dulu di Saldo Akun");

  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  const user = owner || (await prisma.user.findFirst());
  if (!user) throw new Error("Tidak ada user kasir");

  await prisma.$transaction([
    prisma.account.update({
      where: { id: kas.id },
      data: { balance: { increment: bill.total } },
    }),
    prisma.bill.update({
      where: { id: bill.id },
      data: { cashApplied: true },
    }),
    prisma.transaction.create({
      data: {
        txNumber: generateTxNumber(`BILL`),
        userId: user.id,
        accountId: kas.id,
        category: billCategory(bill.jenis),
        amount: bill.total,
        adminBank: 0,
        storeFee: bill.total - (bill.tagihan || 0),
        netProfit: bill.total - (bill.tagihan || 0),
        paymentMethod: "CASH",
        status: "SUCCESS",
        customerName: bill.customer.name,
        customerRef: bill.noPelanggan,
        notes: `Pembayaran tagihan ${billJenisLabel(bill.jenis)} periode ${bill.bulan}`,
        billId: bill.id,
      },
    }),
  ]);
  return true;
}

/**
 * Batal: balikkan semua mutasi yang pernah diterapkan utk tagihan ini.
 * Data historis (imported) dijamin tidak terganggu karena flag false.
 */
export async function revertBillMoney(billId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { customer: true },
  });
  if (!bill) return;

  let providerApplied = bill.providerApplied;
  let cashApplied = bill.cashApplied;

  if (bill.cashApplied) {
    const kas = await getKasAccount();
    if (kas && bill.total != null) {
      await prisma.account.update({
        where: { id: kas.id },
        data: { balance: { decrement: bill.total } },
      });
    }
    await prisma.transaction.deleteMany({ where: { billId: bill.id } });
    cashApplied = false;
  }

  if (bill.providerApplied && bill.accountId && bill.tagihan) {
    await prisma.account.update({
      where: { id: bill.accountId },
      data: { balance: { increment: bill.tagihan } },
    });
    providerApplied = false;
  }

  await prisma.bill.update({
    where: { id: bill.id },
    data: {
      providerApplied,
      cashApplied,
      providerPaidAt: null,
      customerPaidAt: null,
    },
  });
}
