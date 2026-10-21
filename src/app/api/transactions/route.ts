import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNetProfit, calculateTransactionImpact } from "@/lib/accounting";
import { generateTxNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const accountId = searchParams.get("accountId");
    const search = searchParams.get("search");

    const where: any = {};
    if (category) where.category = category;
    if (accountId) where.accountId = accountId;
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerRef: { contains: search } },
        { txNumber: { contains: search } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        account: true,
        user: true,
        bill: { select: { admin: true, status: true, jenis: true } },
      },
      take: 100,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      accountId,
      category,
      amount,
      adminBank = 0,
      storeFee = 0,
      paymentMethod = "CASH",
      customerName,
      customerRef,
      notes,
      userId,
    } = body;

    if (!accountId || !category || !amount) {
      return NextResponse.json(
        { success: false, error: "Akun, Kategori, dan Nominal transaksi wajib diisi" },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Akun tidak ditemukan" }, { status: 404 });
    }

    // Hitung profit otomatis: Fee Toko - Admin Bank
    const netProfit = calculateNetProfit(Number(storeFee), Number(adminBank));

    // Hitung dampak ke saldo provider & cash drawer
    const { accountDelta } = calculateTransactionImpact(
      category,
      Number(amount),
      Number(adminBank),
      Number(storeFee),
      paymentMethod
    );

    // Cek kecukupan saldo jika saldo akun berkurang
    if (accountDelta < 0 && account.balance < Math.abs(accountDelta)) {
      return NextResponse.json(
        {
          success: false,
          error: `Saldo provider ${account.name} tidak mencukupi (Tersedia: Rp ${account.balance.toLocaleString("id-ID")}, Dibutuhkan: Rp ${Math.abs(accountDelta).toLocaleString("id-ID")})`,
        },
        { status: 400 }
      );
    }

    // Ambil open shift
    const activeShift = await prisma.shift.findFirst({
      where: { status: "OPEN" },
      orderBy: { startTime: "desc" },
    });

    // Ambil default user jika tidak dikirim
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json({ success: false, error: "User kasir tidak valid" }, { status: 400 });
    }

    // Jalankan dalam transaksi atomik Prisma
    const [tx, updatedAccount] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          txNumber: generateTxNumber(),
          userId: user.id,
          shiftId: activeShift ? activeShift.id : null,
          accountId,
          category,
          amount: Number(amount),
          adminBank: Number(adminBank),
          storeFee: Number(storeFee),
          netProfit,
          paymentMethod,
          status: "SUCCESS",
          customerName: customerName || null,
          customerRef: customerRef || null,
          notes: notes || null,
        },
        include: {
          account: true,
          user: true,
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: accountDelta },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: tx,
      accountBalance: updatedAccount.balance,
      message: "Transaksi berhasil dicatat dalam 3 detik!",
    });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
