import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const data = await getDashboardData(session.role, session.userId);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
