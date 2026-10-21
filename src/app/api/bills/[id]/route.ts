import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      providerPaidAt,
      customerPaidAt,
      catatan,
    } = body;

    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    const patch: any = {};

    if (status !== undefined) {
      const newStatus = String(status);
      if (!["BELUM", "TALANGAN", "LUNAS"].includes(newStatus)) {
        return NextResponse.json({ success: false, error: "Status tidak valid" }, { status: 400 });
      }
      patch.status = newStatus;

      // Logic waktu default supaya operator tidak salah input:
      // -> TALANGAN  : agen sudah bayar ke provider
      // -> LUNAS     : pelanggan sudah bayar
      if (newStatus === "TALANGAN" && !providerPaidAt && !existing.providerPaidAt) {
        patch.providerPaidAt = new Date();
      }
      if (newStatus === "LUNAS" && !customerPaidAt && !existing.customerPaidAt) {
        patch.customerPaidAt = new Date();
      }
      if (newStatus === "LUNAS" && !providerPaidAt && !existing.providerPaidAt) {
        // LUNAS tanpa pernah talangan: pelanggan bayar langsung sama hari
        patch.providerPaidAt = new Date();
      }
      if (newStatus === "BELUM") {
        // Dibatalkan ke belum: reset pembayaran
        patch.tagihan = null;
        patch.admin = null;
        patch.total = null;
        patch.providerPaidAt = null;
        patch.customerPaidAt = null;
      }
    }

    // Nominal bisa diisi manual (koreksi / status BELUM naik level)
    if (tagihan !== undefined) patch.tagihan = tagihan === null || tagihan === "" ? null : Math.round(Number(tagihan));
    if (admin !== undefined) patch.admin = admin === null || admin === "" ? null : Math.round(Number(admin));

    const finalTagihan = patch.tagihan !== undefined ? patch.tagihan : existing.tagihan;
    const finalAdmin = patch.admin !== undefined ? patch.admin : existing.admin;
    if (finalTagihan != null && finalAdmin != null) {
      patch.total = finalTagihan + finalAdmin;
    }

    if (providerPaidAt !== undefined) patch.providerPaidAt = providerPaidAt ? new Date(providerPaidAt) : null;
    if (customerPaidAt !== undefined) patch.customerPaidAt = customerPaidAt ? new Date(customerPaidAt) : null;
    if (catatan !== undefined) patch.catatan = catatan || null;

    const updated = await prisma.bill.update({ where: { id }, data: patch });
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
    await prisma.bill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
