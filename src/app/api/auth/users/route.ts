import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
      orderBy: { role: "asc" },
    });
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
