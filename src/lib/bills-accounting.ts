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

async function getUser() {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  return owner || (await prisma.user.findFirst());
}

/**
 * Event "agend membayar provider": saldo akun sumber (BRILink) dipotong
 * sebesar tagihan + struk TRANSFER di Data Transaksi (Akun = BRILink).
 * Nominal struk = tagihan; untung belum diakui (diakui saat pelanggan bayar).
 */
export async function applyProviderDeduct(billId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { customer: true },
  });
  if (!bill || !bill.accountId || !bill.tagihan) return false;
  if (bill.providerApplied) return false;

  const user = await getUser();
  if (!user) throw new Error("Tidak ada user kasir");

  await prisma.$transaction([
    prisma.account.update({
      where: { id: bill.accountId },
      data: { balance: { decrement: bill.tagihan } },
    }),
    prisma.bill.update({
      where: { id: bill.id },
      data: { providerApplied: true },
    }),
    prisma.transaction.create({
      data: {
        txNumber: generateTxNumber("BILL"),
        userId: user.id,
        accountId: bill.accountId,
        category: billCategory(bill.jenis),
        amount: bill.tagihan,
        adminBank: 0,
        storeFee: 0,
        netProfit: 0,
        paymentMethod: "TRANSFER",
        status: "SUCCESS",
        customerName: bill.customer.name,
        customerRef: bill.noPelanggan,
        notes: `Potongan tagihan ${billJenisLabel(bill.jenis)} periode ${bill.bulan} (${
          bill.status === "LUNAS" ? "langsung" : "talangan"
        })`,
        billId: bill.id,
      },
    }),
  ]);
  return true;
}

/**
 * Event "pelanggan membayar": kas (laci) masuk total + struk CASH kutuk
 * (nominal tagihan, untung = admin). Konsisten dengan opname shift di mana
 * kas masuk = tagihan + admin (total) — tak terhitung ganda.
 */
export async function applyCashPayment(billId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { customer: true },
  });
  if (!bill || bill.total == null || bill.tagihan == null) return false;
  if (bill.cashApplied) return false;
  const tagihan = bill.tagihan;
  const admin = bill.admin ?? 0;

  const kas = await getKasAccount();
  if (!kas) {
    throw new Error("Akun Laci Kasir (CASH_DRAWER) belum ada — tambahkan dulu di Saldo Akun");
  }
  const user = await getUser();
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
        txNumber: generateTxNumber("BILL"),
        userId: user.id,
        accountId: kas.id,
        category: billCategory(bill.jenis),
        amount: tagihan,
        adminBank: 0,
        storeFee: admin,
        netProfit: admin,
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
 * Pembatalan (batal): membalikkan semua mutasi yang diterapkan untuk tagihan ini —
 * hapus kedua struk, kembalikan saldo kas & akun sumber. Data historis (flag false)
 * pastikan tidak terganggu.
 */
export async function revertBillMoney(billId: string) {
  const bill = await prisma.bill.findUnique({ where: { id: billId } });
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
    await prisma.transaction.deleteMany({ where: { billId: bill.id, paymentMethod: "CASH" } });
    cashApplied = false;
  }

  if (bill.providerApplied && bill.accountId && bill.tagihan) {
    await prisma.account.update({
      where: { id: bill.accountId },
      data: { balance: { increment: bill.tagihan } },
    });
    await prisma.transaction.deleteMany({
      where: { billId: bill.id, paymentMethod: "TRANSFER" },
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
