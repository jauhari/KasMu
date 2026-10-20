import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, accountNumber, type, balance = 0, color = "#2563eb" } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Nama akun dan tipe wajib diisi" },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        name,
        accountNumber: accountNumber || null,
        type,
        balance: Number(balance),
        color,
      },
    });

    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, accountNumber, type, balance, color, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID akun wajib ada" }, { status: 400 });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        accountNumber: accountNumber !== undefined ? accountNumber : undefined,
        type: type !== undefined ? type : undefined,
        balance: balance !== undefined ? Number(balance) : undefined,
        color: color !== undefined ? color : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
