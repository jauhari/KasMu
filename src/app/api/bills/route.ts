import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyProviderDeduct, applyCashPayment, getBillSourceAccount } from "@/lib/bills-accounting";

const JENIS_VALID = ["PLN", "PDAM", "BPJS TK", "BPJS Kes"];

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const bulan = sp.get("bulan") || undefined;
    const jenis = sp.get("jenis") || undefined;
    const status = sp.get("status") || undefined;
    const customerId = sp.get("customerId") || undefined;
    const q = sp.get("q")?.trim() || undefined;

    const where: any = {};
    if (bulan) where.bulan = bulan;
    if (jenis) where.jenis = jenis;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (q) where.customer = { name: { contains: q } };

    const bills = await prisma.bill.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ providerPaidAt: "desc" }, { createdAt: "desc" }],
    });

    const bulanList = await prisma.bill.findMany({
      distinct: ["bulan"],
      select: { bulan: true },
      orderBy: { bulan: "desc" },
    });

    const totals = {
      count: bills.length,
      lunas: bills.filter((b) => b.status === "LUNAS").length,
      talangan: bills.filter((b) => b.status === "TALANGAN").length,
      belum: bills.filter((b) => b.status === "BELUM").length,
      tagihan: bills.reduce((s, b) => s + (b.tagihan || 0), 0),
      admin: bills.reduce((s, b) => s + (b.admin || 0), 0),
      total: bills.reduce((s, b) => s + (b.total || 0), 0),
      talanganOutstanding: bills
        .filter((b) => b.status === "TALANGAN")
        .reduce((s, b) => s + (b.total || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: bills,
      totals,
      bulanList: bulanList.map((b) => b.bulan),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bulan,
      jenis,
      customerId,
      customerName,
      noPelanggan,

      status = "TALANGAN",
      tagihan,
      admin,
      accountId,
      providerPaidAt,
      customerPaidAt,
      catatan,
    } = body;

    if (!bulan || !jenis || !noPelanggan) {
      return NextResponse.json(
        { success: false, error: "Bulan, jenis, dan no pelanggan wajib diisi" },
        { status: 400 }
      );
    }
    if (!JENIS_VALID.includes(jenis)) {
      return NextResponse.json({ success: false, error: `Jenis tidak dikenal: ${jenis}` }, { status: 400 });
    }

    // Resolve kontak: by id, atau buat baru berdasarkan nama
    let custId = customerId as string | undefined;
    if (!custId) {
      if (!customerName || !String(customerName).trim()) {
        return NextResponse.json(
          { success: false, error: "Pelanggan baru wajib punya nama" },
          { status: 400 }
        );
      }
      const name = String(customerName).trim();
      const existing = await prisma.customer.findUnique({ where: { name } });
      if (existing) {
        custId = existing.id;
      } else {
        const created = await prisma.customer.create({ data: { name } });
        custId = created.id;
      }
    }

    // Pastikan nomor layanan terdaftar utk kontak tsb
    const existingNumber = await prisma.customerNumber.findUnique({
      where: { noPelanggan },
    });
    if (!existingNumber) {
      await prisma.customerNumber.create({
        data: { customerId: custId, jenis, noPelanggan },
      });
    }

    const tagihanNum = tagihan !== undefined && tagihan !== "" ? Math.round(Number(tagihan)) : null;
    const adminNum = admin !== undefined && admin !== "" ? Math.round(Number(admin)) : null;
    const totalNum = tagihanNum !== null && adminNum !== null ? tagihanNum + adminNum : null;

    const providerAt = providerPaidAt
      ? new Date(providerPaidAt)
      : status !== "BELUM"
        ? new Date()
        : null;

    const createData: any = {
      bulan: String(bulan),
      jenis,
      customerId: custId,
      noPelanggan,
      status: String(status),
      tagihan: status === "BELUM" ? null : tagihanNum,
      admin: status === "BELUM" ? null : adminNum,
      total: totalNum,
      providerPaidAt: providerAt,
      customerPaidAt: customerPaidAt ? new Date(customerPaidAt) : null,
      catatan: catatan || null,
    };
    if (accountId) createData.accountId = accountId;
    else {
      // default: akun BRILink (atau bank pertama) — biar kirim langsung mutasi
      const src = await getBillSourceAccount();
      if (src) createData.accountId = src.id;
    }

    const existedBefore = await prisma.bill.findUnique({
      where: { bulan_jenis_noPelanggan: { bulan: String(bulan), jenis, noPelanggan } },
      select: { id: true, status: true },
    });

    const bill = await prisma.bill.upsert({
      where: { bulan_jenis_noPelanggan: { bulan: String(bulan), jenis, noPelanggan } },
      update: {
        status: createData.status,
        tagihan: createData.tagihan,
        admin: createData.admin,
        total: createData.total,
        providerPaidAt: createData.providerPaidAt,
        customerPaidAt: createData.customerPaidAt,
        catatan: createData.catatan,
        accountId: createData.accountId ?? undefined,
      },
      create: createData,
    });

    // Jalankan mutasi uang utk tagihan BARU manual (bukan update tagihan lama)
    if (!existedBefore) {
      if (String(status) === "TALANGAN") {
        await applyProviderDeduct(bill.id);
      } else if (String(status) === "LUNAS") {
        await applyProviderDeduct(bill.id);
        await applyCashPayment(bill.id);
      }
    }

    const final = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: { customer: true },
    });
    return NextResponse.json({ success: true, data: final });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
