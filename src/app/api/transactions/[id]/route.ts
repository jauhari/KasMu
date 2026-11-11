import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  calculateBankCommission,
  calculateNetProfit,
  calculateTransactionImpact,
} from "@/lib/accounting";

async function findLinkedDebt(txNumber: string) {
  return prisma.debtLoan.findFirst({
    where: { notes: { contains: `Kasir TX:${txNumber}` } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Hanya Owner yang boleh mengubah transaksi" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }
    if (tx.billId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaksi ini terhubung ke tagihan pelanggan. Edit/hapus dari tab Tagihan Pelanggan agar status tagihan tetap konsisten.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const category = String(body.category || tx.category);
    const amount = Number(body.amount ?? tx.amount);
    const adminBank = Number(body.adminBank ?? tx.adminBank);
    const storeFee = Number(body.storeFee ?? tx.storeFee);
    const paymentMethod = String(body.paymentMethod || tx.paymentMethod);
    const customerName =
      body.customerName !== undefined ? String(body.customerName).trim() : tx.customerName;
    const customerRef =
      body.customerRef !== undefined ? String(body.customerRef).trim() : tx.customerRef;
    const notes = body.notes !== undefined ? String(body.notes).trim() : tx.notes;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal transaksi harus lebih dari 0" },
        { status: 400 }
      );
    }
    if (adminBank < 0 || storeFee < 0) {
      return NextResponse.json(
        { success: false, error: "Fee tidak boleh negatif" },
        { status: 400 }
      );
    }
    if (tx.status === "HUTANG" && category === "TARIK_TUNAI") {
      return NextResponse.json(
        { success: false, error: "Tarik tunai tidak bisa berstatus hutang" },
        { status: 400 }
      );
    }

    let createdAt: Date | undefined;
    if (body.tanggal) {
      const d = new Date(String(body.tanggal));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: "Tanggal transaksi tidak valid" },
          { status: 400 }
        );
      }
      if (d.getTime() > Date.now() + 5 * 60 * 1000) {
        return NextResponse.json(
          { success: false, error: "Tanggal transaksi tidak bisa di masa depan" },
          { status: 400 }
        );
      }
      createdAt = d;
    }

    const moneyChanged =
      Math.abs(amount - tx.amount) > 0.001 ||
      Math.abs(adminBank - tx.adminBank) > 0.001 ||
      Math.abs(storeFee - tx.storeFee) > 0.001 ||
      category !== tx.category ||
      paymentMethod !== tx.paymentMethod;

    if (moneyChanged && tx.bankCommissionRealized) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cashback BRILink transaksi ini sudah dicairkan. Nominal/fee tidak bisa diubah lagi (nama, tanggal, catatan masih bisa).",
        },
        { status: 400 }
      );
    }

    const debt = tx.status === "HUTANG" ? await findLinkedDebt(tx.txNumber) : null;
    if (debt && debt.remaining < debt.amount - 0.001) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hutang transaksi ini sudah ada pembayaran sebagian. Selesaikan/hapus dulu di menu Hutang/Piutang.",
        },
        { status: 400 }
      );
    }

    const oldImpact = calculateTransactionImpact(
      tx.category,
      tx.amount,
      tx.adminBank,
      tx.storeFee,
      tx.paymentMethod
    );
    const newImpact = calculateTransactionImpact(
      category,
      amount,
      adminBank,
      storeFee,
      paymentMethod
    );
    const accountDelta = newImpact.accountDelta - oldImpact.accountDelta;

    const account = await prisma.account.findUnique({ where: { id: tx.accountId } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: "Akun transaksi tidak ditemukan" },
        { status: 404 }
      );
    }
    if (accountDelta < 0 && account.balance < Math.abs(accountDelta)) {
      return NextResponse.json(
        {
          success: false,
          error: `Saldo provider ${account.name} tidak mencukupi untuk perubahan ini (tersedia Rp ${account.balance.toLocaleString("id-ID")}).`,
        },
        { status: 400 }
      );
    }

    const bankCommission = calculateBankCommission(adminBank);
    const netProfit = tx.status === "HUTANG" ? 0 : calculateNetProfit(storeFee, adminBank);
    const debtTotal = amount + storeFee;

    const ops: any[] = [
      prisma.transaction.update({
        where: { id },
        data: {
          category,
          amount,
          adminBank,
          storeFee,
          bankCommission,
          netProfit,
          paymentMethod,
          customerName: customerName || null,
          customerRef: customerRef || null,
          notes: notes || null,
          ...(createdAt ? { createdAt } : {}),
        },
      }),
    ];

    if (Math.abs(accountDelta) > 0.001) {
      ops.push(
        prisma.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: accountDelta } },
        })
      );
    }

    if (debt) {
      ops.push(
        prisma.debtLoan.update({
          where: { id: debt.id },
          data: { amount: debtTotal, remaining: debtTotal },
        })
      );
    }

    const [updated] = await prisma.$transaction(ops);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Transaksi berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("Update transaction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Hanya Owner yang boleh menghapus transaksi" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }
    if (tx.billId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaksi ini terhubung ke tagihan pelanggan. Hapus dari tab Tagihan Pelanggan agar status tagihan ikut terkoreksi.",
        },
        { status: 400 }
      );
    }

    const debt = tx.status === "HUTANG" ? await findLinkedDebt(tx.txNumber) : null;
    if (debt && debt.remaining < debt.amount - 0.001) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hutang transaksi ini sudah dibayar sebagian. Hapus/pelunasan dulu di menu Hutang/Piutang.",
        },
        { status: 400 }
      );
    }

    const impact = calculateTransactionImpact(
      tx.category,
      tx.amount,
      tx.adminBank,
      tx.storeFee,
      tx.paymentMethod
    );

    // Jika cashback sudah dicairkan, tarik kembali dari saldo akun.
    const commissionRefund = tx.bankCommissionRealized ? tx.bankCommission : 0;

    const ops: any[] = [
      prisma.transaction.delete({ where: { id } }),
      prisma.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: -(impact.accountDelta) - commissionRefund } },
      }),
    ];

    if (commissionRefund > 0) {
      ops.push(
        prisma.cashMutation.deleteMany({
          where: {
            category: "Cashback BRILink",
            notes: { contains: tx.txNumber },
          },
        })
      );
    }

    if (debt) {
      ops.push(prisma.debtLoan.delete({ where: { id: debt.id } }));
    }

    await prisma.$transaction(ops);

    return NextResponse.json({
      success: true,
      message: `Transaksi ${tx.txNumber} dihapus dan saldo provider dikoreksi`,
    });
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
