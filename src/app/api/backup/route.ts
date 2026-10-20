import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const backupData = {
      app: "KasMu",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      users: await prisma.user.findMany(),
      accounts: await prisma.account.findMany(),
      shifts: await prisma.shift.findMany(),
      opnameDetails: await prisma.opnameDetail.findMany(),
      transactions: await prisma.transaction.findMany(),
      cashMutations: await prisma.cashMutation.findMany(),
      debtLoans: await prisma.debtLoan.findMany(),
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kasmu-backup-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || body.app !== "KasMu" || !body.accounts) {
      return NextResponse.json(
        { success: false, error: "File backup tidak valid untuk KasMu" },
        { status: 400 }
      );
    }

    // Clean existing database
    await prisma.opnameDetail.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.cashMutation.deleteMany({});
    await prisma.debtLoan.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});

    // Restore
    if (body.users?.length) {
      for (const u of body.users) {
        await prisma.user.create({ data: { ...u, createdAt: new Date(u.createdAt) } });
      }
    }

    if (body.accounts?.length) {
      for (const a of body.accounts) {
        await prisma.account.create({ data: { ...a, createdAt: new Date(a.createdAt) } });
      }
    }

    if (body.shifts?.length) {
      for (const s of body.shifts) {
        await prisma.shift.create({
          data: {
            ...s,
            startTime: new Date(s.startTime),
            endTime: s.endTime ? new Date(s.endTime) : null,
          },
        });
      }
    }

    if (body.transactions?.length) {
      for (const t of body.transactions) {
        await prisma.transaction.create({
          data: { ...t, createdAt: new Date(t.createdAt) },
        });
      }
    }

    if (body.cashMutations?.length) {
      for (const m of body.cashMutations) {
        await prisma.cashMutation.create({
          data: { ...m, createdAt: new Date(m.createdAt) },
        });
      }
    }

    if (body.debtLoans?.length) {
      for (const d of body.debtLoans) {
        await prisma.debtLoan.create({
          data: {
            ...d,
            createdAt: new Date(d.createdAt),
            dueDate: d.dueDate ? new Date(d.dueDate) : null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data KasMu berhasil dipulihkan (Restore Sukses)!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
