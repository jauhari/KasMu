import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        numbers: true,
        _count: { select: { bills: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: customers });
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
