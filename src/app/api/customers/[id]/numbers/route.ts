import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Sesi tidak valid" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { jenis, noPelanggan } = body;

    if (!jenis || !String(jenis).trim()) {
      return NextResponse.json({ success: false, error: "Jenis layanan wajib diisi" }, { status: 400 });
    }
    if (!noPelanggan || !String(noPelanggan).trim()) {
      return NextResponse.json({ success: false, error: "Nomor pelanggan wajib diisi" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Kontak tidak ditemukan" }, { status: 404 });
    }

    const cleanNumber = String(noPelanggan).trim();
    const existing = await prisma.customerNumber.findUnique({ where: { noPelanggan: cleanNumber } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Nomor ${cleanNumber} sudah terdaftar` },
        { status: 409 }
      );
    }

    const created = await prisma.customerNumber.create({
      data: {
        customerId: id,
        jenis: String(jenis).trim(),
        noPelanggan: cleanNumber,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
