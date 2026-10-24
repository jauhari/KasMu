import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyProviderDeduct, applyCashPayment, revertBillMoney } from "@/lib/bills-accounting";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      tagihan,
      admin,
      accountId,
      providerPaidAt,
      customerPaidAt,
      catatan,
    } = body;

    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    if (customerPaidAt !== undefined) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ success: false, error: "Belum terautentikasi" }, { status: 401 });
      }
      if (session.role !== "OWNER") {
        return NextResponse.json(
          { success: false, error: "Hanya owner yang bisa mengatur waktu pelunasan manual" },
          { status: 403 }
        );
      }
    }

    if (accountId !== undefined && accountId !== existing.accountId && existing.providerApplied) {
      return NextResponse.json(
        { success: false, error: "Saldo akun tagihan ini sudah termutasi — tidak bisa ganti akun" },
        { status: 400 }
      );
    }

    const moneyApplied = existing.providerApplied || existing.cashApplied;
    const editingMoney = tagihan !== undefined || admin !== undefined;
    if (moneyApplied && editingMoney && status !== "BELUM") {
      return NextResponse.json(
        {
          success: false,
          error: "Uang tagihan ini sudah termutasi — batalkan dulu sebelum ubah nominal",
        },
        { status: 400 }
      );
    }

    const patch: any = {};
    if (accountId !== undefined) patch.accountId = accountId || null;

    if (tagihan !== undefined) {
      patch.tagihan = tagihan === null || tagihan === "" ? null : Math.round(Number(tagihan));
    }
    if (admin !== undefined) {
      patch.admin = admin === null || admin === "" ? null : Math.round(Number(admin));
    }

    if (status !== undefined) {
      const newStatus = String(status);
      if (!["BELUM", "TALANGAN", "LUNAS"].includes(newStatus)) {
        return NextResponse.json({ success: false, error: "Status tidak valid" }, { status: 400 });
      }
      patch.status = newStatus;

      if (newStatus === "LUNAS") {
        if (existing.providerPaidAt === null && patch.providerPaidAt === undefined) {
          patch.providerPaidAt = providerPaidAt ? new Date(providerPaidAt) : new Date();
        }
        if (existing.customerPaidAt === null && patch.customerPaidAt === undefined) {
          patch.customerPaidAt = customerPaidAt ? new Date(customerPaidAt) : new Date();
        }
      } else if (newStatus === "TALANGAN") {
        if (existing.providerPaidAt === null && patch.providerPaidAt === undefined) {
          patch.providerPaidAt = providerPaidAt ? new Date(providerPaidAt) : new Date();
        }
      } else if (newStatus === "BELUM" && existing.status !== "BELUM") {
        // Batal ke belum: tulis status dulu, lalu balikkan semua mutasi
        await prisma.bill.update({ where: { id }, data: { ...patch, status: newStatus } });
        await revertBillMoney(id);
        const updated = await prisma.bill.findUnique({ where: { id }, include: { customer: true } });
        return NextResponse.json({ success: true, data: updated });
      }
    } else {
      // tanpa perubahan status: edit waktu/catatan manual
      if (providerPaidAt !== undefined) {
        patch.providerPaidAt = providerPaidAt ? new Date(providerPaidAt) : null;
      }
      if (customerPaidAt !== undefined) {
        patch.customerPaidAt = customerPaidAt ? new Date(customerPaidAt) : null;
      }
    }

    // tulis perubahan (termasuk tagihan/admin utk kirim dari BELUM)
    await prisma.bill.update({ where: { id }, data: patch });

    // jalankan mutasi uang sesuai status final
    const finalStatus = patch.status ?? existing.status;
    if (finalStatus === "TALANGAN") {
      await applyProviderDeduct(id);
    } else if (finalStatus === "LUNAS") {
      await applyProviderDeduct(id);
      await applyCashPayment(id);
    }

    const updated = await prisma.bill.findUnique({
      where: { id },
      include: { customer: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    // Balikkan dulu semua mutasi terkait (aman utk data historis: flag false)
    await revertBillMoney(id);
    await prisma.bill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
