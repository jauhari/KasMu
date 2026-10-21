import { prisma } from "@/lib/prisma";

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

/** Akun sumber potongan tagihan: akun yang mengandung "brilink", fallback bank pertama */
export async function getBillSourceAccount() {
  const account = await prisma.account.findMany({
    where: { isActive: true, OR: [{ type: "BANK" }, { type: "E_WALLET" }] },
  });
  const byName = account.find((a) => a.name.toLowerCase().includes("brilink"));
  if (byName) return byName;
  return account[0] || null;
}

function jenisCode(jenis: string): string {
  if (jenis === "PLN") return "P";
  if (jenis === "PDAM") return "D";
  if (jenis === "BPJS TK") return "T";
  if (jenis === "BPJS Kes") return "K";
  return jenis.slice(0, 1).toUpperCase();
}

/** Nomor struk deterministik per tagihan — idempoten & aman untuk import massal */
function billTxNumber(bill: { jenis: string; noPelanggan: string; bulan: string }, fase: "KIRIM" | "BAYAR"): string {
  return `${fase}-${jenisCode(bill.jenis)}-${bill.noPelanggan}-${bill.bulan}`;
}

async function getUser() {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  return owner || (await prisma.user.findFirst());
}

/**
 * Event "agen membayar provider": saldo akun sumber (BRILink) dipotong
 * sebesar tagihan + struk TRANSFER di Data Transaksi (Akun = BRILink).
 * Nominal struk = tagihan; untung belum diakui (diakui saat pelanggan bayar).
 * opts.accountId: sumber untuk tagihan yang belum punya akun (mis. hasil import).
 * opts.at: waktu struk (mis. tanggal dibayar ke provider dari CSV).
 */
export async function applyProviderDeduct(
  billId: string,
  opts: { accountId?: string | null; at?: Date } = {}
) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { customer: true },
  });
  if (!bill || bill.providerApplied) return false;

  const accountId = bill.accountId || opts.accountId || null;
  if (!accountId || !bill.tagihan) return false;

  const user = await getUser();
  if (!user) throw new Error("Tidak ada user kasir");

  await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: bill.tagihan } },
    }),
    prisma.bill.update({
      where: { id: bill.id },
      data: {
        providerApplied: true,
        accountId,
        providerPaidAt: opts.at && !bill.providerPaidAt ? opts.at : undefined,
      },
    }),
    prisma.transaction.create({
      data: {
        txNumber: billTxNumber(bill, "KIRIM"),
        userId: user.id,
        accountId,
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
          bill.status === "LUNAS" ? "pelanggan juga sudah bayar" : "talangan"
        })`,
        billId: bill.id,
        createdAt: opts.at ?? new Date(),
      },
    }),
  ]);
  return true;
}

/**
 * Event "pelanggan membayar": kas (laci) masuk total + struk CASH
 * (nominal tagihan, untung = admin). Konsisten dengan opname shift:
 * kas masuk = tagihan + admin = total — tidak terhitung ganda.
 * opts.at: waktu struk (mis. tanggal pelanggan bayar dari CSV).
 */
export async function applyCashPayment(billId: string, opts: { at?: Date } = {}) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { customer: true },
  });
  if (!bill || bill.total == null || bill.tagihan == null) return false;
  if (bill.cashApplied) return false;
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
      data: {
        cashApplied: true,
        customerPaidAt: opts.at && !bill.customerPaidAt ? opts.at : undefined,
      },
    }),
    prisma.transaction.create({
      data: {
        txNumber: billTxNumber(bill, "BAYAR"),
        userId: user.id,
        accountId: kas.id,
        category: billCategory(bill.jenis),
        amount: bill.tagihan,
        adminBank: 0,
        storeFee: admin,
        netProfit: admin,
        paymentMethod: "CASH",
        status: "SUCCESS",
        customerName: bill.customer.name,
        customerRef: bill.noPelanggan,
        notes: `Pembayaran tagihan ${billJenisLabel(bill.jenis)} periode ${bill.bulan}`,
        billId: bill.id,
        createdAt: opts.at ?? new Date(),
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
