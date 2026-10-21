import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyProviderDeduct, applyCashPayment, getBillSourceAccount } from "@/lib/bills-accounting";

const JENIS_VALID = ["PLN", "PDAM", "BPJS TK", "BPJS Kes"];

// RFC4180: quoted fields, koma & kutip ganda di dalam kutip
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  text = text.replace(/^\uFEFF/, "");

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function mapStatus(s: string): string {
  const x = (s || "").trim().toUpperCase();
  if (x === "LUNAS") return "LUNAS";
  if (x === "TALANGAN") return "TALANGAN";
  if (x === "BELUM") return "BELUM";
  throw new Error(`Status tidak dikenal: "${s}"`);
}

function toDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.length === 5 ? timeStr : "00:00";
  const d = new Date(`${dateStr}T${t}:00+07:00`);
  if (d.toString() === "Invalid Date" || isNaN(d.getTime())) {
    throw new Error(`Tanggal tidak valid: ${dateStr} ${timeStr}`);
  }
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const csvText = typeof body.csv === "string" ? body.csv : "";

    if (!csvText.trim()) {
      return NextResponse.json({ success: false, error: "Data CSV kosong" }, { status: 400 });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json({ success: false, error: "Tidak ada baris data" }, { status: 400 });
    }
    const header = rows[0].map((h) => h.trim());
    if (header[1] !== "Jenis" || header[2] !== "Nama" || header[3] !== "No. Pelanggan") {
      return NextResponse.json(
        { success: false, error: "Header CSV tidak sesuai format ekspor" },
        { status: 400 }
      );
    }

    // ===== validasi semua dulu — ada error = tidak menulis apa pun =====
    const errors: string[] = [];
    const parsed: any[] = [];

    rows.slice(1).forEach((r, idx) => {
      const line = idx + 2;
      try {
        const [
          bulan, jenis, nama, noPel, status, tagihan, admin, total,
          tglProvider, jamProvider, tglCustomer, jamCustomer, catatan,
        ] = r.map((f) => f.trim());

        if (!/^\d{4}-\d{2}$/.test(bulan)) throw new Error(`Bulan "${bulan}" tidak valid`);
        if (!nama) throw new Error("Nama kosong");
        if (!noPel) throw new Error("No. Pelanggan kosong");
        if (!JENIS_VALID.includes(jenis)) throw new Error(`Jenis "${jenis}" tidak dikenal`);

        const st = mapStatus(status);
        let tg: number | null = null;
        let ad: number | null = null;
        let tt: number | null = null;
        if (st !== "BELUM") {
          tg = parseInt(tagihan, 10);
          ad = parseInt(admin, 10);
          tt = parseInt(total, 10);
          if (!Number.isFinite(tg) || !Number.isFinite(ad) || !Number.isFinite(tt)) {
            throw new Error(`Nominal bukan angka (${tagihan}/${admin}/${total})`);
          }
          if (tg + ad !== tt) throw new Error(`tagihan+admin != total (${tg}+${ad}!=${tt})`);
        }

        if (st === "BELUM" && (tglProvider || tglCustomer)) {
          throw new Error("Status BELUM tapi ada waktu bayar");
        }
        if (st === "TALANGAN" && customerAt(tglCustomer, jamCustomer)) {
          throw new Error("Status TALANGAN tapi pelanggan sudah bayar?");
        }
        if (st !== "BELUM" && !providerAt(tglProvider, jamProvider)) {
          throw new Error("Tanpa waktu dibayar ke provider");
        }

        parsed.push({
          bulan,
          jenis,
          nama,
          noPel,
          status: st,
          tagihan: st === "BELUM" ? null : tg,
          admin: st === "BELUM" ? null : ad,
          total: st === "BELUM" ? null : tt,
          providerAt: providerAt(tglProvider, jamProvider),
          customerAt: customerAt(tglCustomer, jamCustomer),
          catatan: catatan || null,
          line,
        });
      } catch (err: any) {
        errors.push(`Baris ${line}: ${err.message}`);
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: `Validasi gagal (${errors.length} baris):`, detail: errors.slice(0, 10) },
        { status: 400 }
      );
    }

    // duplikat dalam CSV
    const seen = new Map<string, number>();
    for (const p of parsed) {
      const key = `${p.bulan}|${p.jenis}|${p.noPel}`;
      if (seen.has(key)) {
        return NextResponse.json(
          { success: false, error: `Duplikat ${key} (baris ${seen.get(key)} & ${p.line})` },
          { status: 400 }
        );
      }
      seen.set(key, p.line);
    }

    // ===== upsert + terapkan mutasi uang & struk =====
    let created = 0;
    let updated = 0;
    let customersCreated = 0;
    let strukKirim = 0;
    let strukBayar = 0;
    const warnings: string[] = [];

    const source = await getBillSourceAccount();

    for (const p of parsed) {
      let customer = await prisma.customer.findUnique({ where: { name: p.nama } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { name: p.nama } });
        customersCreated++;
      }
      const num = await prisma.customerNumber.findUnique({ where: { noPelanggan: p.noPel } });
      if (!num) {
        await prisma.customerNumber.create({
          data: { customerId: customer.id, jenis: p.jenis, noPelanggan: p.noPel },
        });
      }

      const data: any = {
        bulan: p.bulan,
        jenis: p.jenis,
        customerId: customer.id,
        noPelanggan: p.noPel,
        status: p.status,
        tagihan: p.tagihan,
        admin: p.admin,
        total: p.total,
        providerPaidAt: p.providerAt,
        customerPaidAt: p.customerAt,
        catatan: p.catatan,
      };

      const existingBill = await prisma.bill.findUnique({
        where: { bulan_jenis_noPelanggan: { bulan: p.bulan, jenis: p.jenis, noPelanggan: p.noPel } },
      });
      let bill;
      if (existingBill) {
        if (!existingBill.accountId && source) data.accountId = source.id;
        bill = await prisma.bill.update({ where: { id: existingBill.id }, data });
        updated++;
      } else {
        if (source) data.accountId = source.id;
        bill = await prisma.bill.create({ data });
        created++;
      }

      // --- uang & struk: hanya jika belum diterapkan (idempoten) ---
      try {
        if (await applyProviderDeduct(bill.id, { at: p.providerAt ?? undefined })) strukKirim++;
      } catch (e: any) {
        warnings.push(`Baris ${p.line}: kirim gagal — ${e.message}`);
      }
      if (p.status === "LUNAS") {
        try {
          if (await applyCashPayment(bill.id, { at: p.customerAt ?? undefined })) strukBayar++;
        } catch (e: any) {
          warnings.push(`Baris ${p.line}: pelanggan bayar gagal — ${e.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        baris: parsed.length,
        created,
        updated,
        customersCreated,
        strukKirim,
        strukBayar,
        warnings,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function providerAt(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  return toDateTime(dateStr, timeStr);
}
function customerAt(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  return toDateTime(dateStr, timeStr);
}
