import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Belum terautentikasi" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      userId: session.userId,
      username: session.username,
      name: session.name,
      role: session.role,
    },
  });
}
