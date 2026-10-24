import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNetProfit } from "@/lib/accounting";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        numbers: true,
        bills: {
          select: {
            id: true,
            bulan: true,
            jenis: true,
            status: true,
            tagihan: true,
            admin: true,
            total: true,
            noPelanggan: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // ===== Transaksi kasir: masuk nama kontak (wajar — struk memakai nama) =====
    const txs = await prisma.transaction.findMany({
      where: { status: "SUCCESS" },
      select: {
        id: true,
        customerName: true,
        amount: true,
        adminBank: true,
        storeFee: true,
        netProfit: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 3000,
    });

    const nameToTx = new Map<string, typeof txs>();
    for (const t of txs) {
      if (!t.customerName) continue;
      const key = t.customerName.trim();
      if (!nameToTx.has(key)) nameToTx.set(key, []);
      nameToTx.get(key)!.push(t);
    }

    const data = customers.map((c) => {
      const bills = c.bills;
      const lunas = bills.filter((b) => b.status === "LUNAS");
      const talangan = bills.filter((b) => b.status === "TALANGAN");
      const belum = bills.filter((b) => b.status === "BELUM");

      // Untung tagihan yang SUDAH CAIR (lunas) — konsisten dengan dashboard:
      // profit diakui saat pelanggan bayar, bukan saat diberangkatkan.
      const adminLunas = lunas.reduce((s, b) => s + (b.admin || 0), 0);
      // Potensi untung dari tagihan talangan yang pelanggan belum bayar.
      const adminTalangan = talangan.reduce((s, b) => s + (b.admin || 0), 0);

      const txsThis = nameToTx.get(c.name) || [];
      const txTotal = txsThis.reduce((s, t) => s + t.amount, 0);
      const txUntung = txsThis.reduce((s, t) => s + calculateNetProfit(t.storeFee, t.adminBank), 0);

      return {
        id: c.id,
        name: c.name,
        numbers: c.numbers.map((n) => ({ id: n.id, jenis: n.jenis, noPelanggan: n.noPelanggan })),
        tagihan: {
          total: bills.length,
          lunas: lunas.length,
          talangan: talangan.length,
          belum: belum.length,
          nilai: lunas.reduce((s, b) => s + (b.total || 0), 0),
          admin: adminLunas,
          adminTalangan: adminTalangan,
          outstanding: talangan.reduce((s, b) => s + (b.total || 0), 0),
        },
        transaksi: {
          count: txsThis.length,
          total: txTotal,
          untung: txUntung,
        },
        besarSemua: bills.reduce(
          (s, b) => s + (b.total || 0),
          0
        ),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, notes, numbers } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: "Nama kontak wajib diisi" }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const existing = await prisma.customer.findUnique({ where: { name: cleanName } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Kontak "${cleanName}" sudah ada` },
        { status: 409 }
      );
    }

    const numberList: { jenis: string; noPelanggan: string }[] = Array.isArray(numbers) ? numbers : [];
    for (const n of numberList) {
      if (!n.noPelanggan) continue;
      const dup = await prisma.customerNumber.findUnique({ where: { noPelanggan: n.noPelanggan } });
      if (dup) {
        return NextResponse.json(
          { success: false, error: `No pelanggan ${n.noPelanggan} sudah terdaftar` },
          { status: 409 }
        );
      }
    }

    const created = await prisma.customer.create({
      data: {
        name: cleanName,
        phone: phone || null,
        notes: notes || null,
        numbers: {
          create: numberList
            .filter((n: { noPelanggan: string }) => n.noPelanggan)
            .map((n: { jenis: string; noPelanggan: string }) => ({
              jenis: n.jenis || "PLN",
              noPelanggan: n.noPelanggan,
            })),
        },
      },
      include: { numbers: true },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
