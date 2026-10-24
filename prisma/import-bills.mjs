import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- RFC4180 CSV parser (quoted fields, koma di dalam kutip) ----------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  text = text.replace(/^\uFEFF/, ""); // strip BOM

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
  // baris terakhir
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

// ---------- gabung tanggal + jam jadi Date ketat UTC+7 (WIB) ----------
function toDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // dateStr: 2026-10-14 ; timeStr: 08:00
  return new Date(`${dateStr}T${timeStr.length === 5 ? timeStr : "00:00"}:00+07:00`);
}

function mapStatus(s) {
  const x = (s || "").trim().toUpperCase();
  if (x === "LUNAS") return "LUNAS";
  if (x === "TALANGAN") return "TALANGAN";
  if (x === "BELUM") return "BELUM";
  throw new Error(`Status tidak dikenal: "${s}"`);
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node prisma/import-bills.mjs <file.csv>");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf8");
  const rows = parseCSV(raw);

  if (rows.length === 0) {
    console.error("CSV kosong / tidak terbaca");
    process.exit(1);
  }

  const header = rows[0].map((h) => h.trim());
  const expected = [
    "Bulan", "Jenis", "Nama", "No. Pelanggan", "Status", "Tagihan", "Admin", "Total",
    "Dibayar ke PLN", "Jam ke PLN", "Pelanggan bayar", "Jam pelanggan bayar", "Catatan",
  ];
  const headerMatch = header.every((h, idx) => h === expected[idx]);
  if (!headerMatch) {
    console.error("Header CSV tidak sesuai:", header);
    process.exit(1);
  }

  const dataRows = rows.slice(1);

  // ---------- validasi penuh SEBELUM menulis ke DB ----------
  const errors = [];
  const parsed = [];
  dataRows.forEach((r, idx) => {
    const line = idx + 2; // header = baris 1
    const [
      bulan, jenis, nama, noPel, status, tagihan, admin, total,
      tglProvider, jamProvider, tglCustomer, jamCustomer, catatan,
    ] = r.map((f) => f.trim());

    if (!/^\d{4}-\d{2}$/.test(bulan)) errors.push(`Baris ${line}: Bulan "${bulan}" tidak valid`);
    if (!nama) errors.push(`Baris ${line}: Nama kosong`);
    if (!noPel) errors.push(`Baris ${line}: No. Pelanggan kosong`);

    const st = mapStatus(status);
    let tg = null, ad = null, tt = null;
    if (st !== "BELUM") {
      tg = parseInt(tagihan, 10);
      ad = parseInt(admin, 10);
      tt = parseInt(total, 10);
      if (!Number.isFinite(tg) || !Number.isFinite(ad) || !Number.isFinite(tt)) {
        errors.push(`Baris ${line}: nominal bukan angka (${tagihan}/${admin}/${total})`);
      } else if (tg + ad !== tt) {
        errors.push(`Baris ${line}: tagihan+admin != total (${tg}+${ad}!=${tt})`);
      }
    }

    const providerAt = toDateTime(tglProvider, jamProvider);
    const customerAt = toDateTime(tglCustomer, jamCustomer);

    // konsistensi logis
    if (st === "BELUM" && (providerAt || customerAt)) {
      errors.push(`Baris ${line}: status BELUM tapi ada waktu bayar`);
    }
    if (st === "TALANGAN" && !providerAt) {
      errors.push(`Baris ${line}: status TALANGAN tapi tanpa waktu dibayar ke provider`);
    }
    if (st === "TALANGAN" && customerAt) {
      errors.push(`Baris ${line}: status TALANGAN tapi pelanggan sudah bayar?`);
    }
    if (st === "LUNAS" && !providerAt) {
      errors.push(`Baris ${line}: status LUNAS tapi tanpa waktu dibayar ke provider`);
    }
    if (providerAt && providerAt.toString() === "Invalid Date") {
      errors.push(`Baris ${line}: tanggal provider tidak valid`);
    }
    if (customerAt && customerAt.toString() === "Invalid Date") {
      errors.push(`Baris ${line}: tanggal pelanggan tidak valid`);
    }

    parsed.push({
      bulan,
      jenis,
      nama,
      noPel,
      status: st,
      tagihan: tg,
      admin: ad,
      total: tt,
      providerAt,
      customerAt,
      catatan: catatan || null,
      line,
    });
  });

  if (errors.length > 0) {
    console.error("VALIDASI GAGAL — tidak ada data yang ditulis:");
    errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  // ---------- duplikat dalam CSV ----------
  const seen = new Map();
  for (const p of parsed) {
    const key = `${p.bulan}|${p.jenis}|${p.noPel}`;
    if (seen.has(key)) {
      console.error(`VALIDASI GAGAL: duplikat ${key} (baris ${seen.get(key)} & ${p.line})`);
      process.exit(1);
    }
    seen.set(key, p.line);
  }

  // ---------- tulis ke DB (idempoten: upsert) ----------
  let billsCreated = 0;
  let billsUpdated = 0;
  let customersCreated = 0;
  let numbersCreated = 0;
  let strukKirim = 0;
  let strukBayar = 0;
  const gagal = [];

  // akun sumber potongan & laci kasir
  const src =
    (await prisma.account.findFirst({
      where: { isActive: true, name: { contains: "brilink" } },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.account.findFirst({
      where: { isActive: true, type: "BANK" },
      orderBy: { createdAt: "asc" },
    }));
  const kas = await prisma.account.findFirst({
    where: { isActive: true, type: "CASH_DRAWER" },
    orderBy: { createdAt: "asc" },
  });
  if (!src) console.error("PERINGATAN: tidak ada akun sumber potongan (BRILink) — struk kirim dilewati");
  if (!kas) console.error("PERINGATAN: tidak ada akun CASH_DRAWER — struk pelanggan bayar dilewati");
  const owner =
    (await prisma.user.findFirst({ where: { role: "OWNER" } })) ||
    (await prisma.user.findFirst());

  function jenisCode(j) {
    return { PLN: "P", PDAM: "D", "BPJS TK": "T", "BPJS Kes": "K" }[j] || j.slice(0, 1).toUpperCase();
  }
  function billTxNumber(p, fase) {
    return `${fase}-${jenisCode(p.jenis)}-${p.noPel}-${p.bulan}`;
  }
  function billCategory(j) {
    if (j === "PLN") return "TAGIHAN_PLN";
    if (j === "PDAM") return "TAGIHAN_PDAM";
    if (j.startsWith("BPJS")) return "TAGIHAN_BPJS";
    return "LAINNYA";
  }

  for (const p of parsed) {
    // kontak
    let customer = await prisma.customer.findUnique({ where: { name: p.nama } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: p.nama } });
      customersCreated++;
    }

    // nomor layanan
    const existingNumber = await prisma.customerNumber.findUnique({
      where: { noPelanggan: p.noPel },
    });
    if (!existingNumber) {
      await prisma.customerNumber.create({
        data: { customerId: customer.id, jenis: p.jenis, noPelanggan: p.noPel },
      });
      numbersCreated++;
    }

    const billData = {
      bulan: p.bulan,
      jenis: p.jenis,
      customerId: customer.id,
      noPelanggan: p.noPel,
      status: p.status,
      tagihan: p.status === "BELUM" ? null : p.tagihan,
      admin: p.status === "BELUM" ? null : p.admin,
      total: p.status === "BELUM" ? null : p.total,
      providerPaidAt: p.providerAt,
      customerPaidAt: p.customerAt,
      catatan: p.catatan,
      accountId: src ? src.id : null,
    };

    const existingBill = await prisma.bill.findUnique({
      where: { bulan_jenis_noPelanggan: { bulan: p.bulan, jenis: p.jenis, noPelanggan: p.noPel } },
    });

    let bill;
    if (existingBill) {
      const upd = { ...billData };
      if (existingBill.accountId) delete upd.accountId; // jangan tukar akun yang sudah termutasi
      bill = await prisma.bill.update({ where: { id: existingBill.id }, data: upd });
      billsUpdated++;
    } else {
      bill = await prisma.bill.create({ data: billData });
      billsCreated++;
    }

    // --- uang & struk: hanya jika belum diterapkan (idempoten) ---
    if (src && owner && bill.tagihan && bill.providerPaidAt && !bill.providerApplied) {
      try {
        await prisma.$transaction([
          prisma.account.update({
            where: { id: src.id },
            data: { balance: { decrement: bill.tagihan } },
          }),
          prisma.bill.update({
            where: { id: bill.id },
            data: { providerApplied: true },
          }),
          prisma.transaction.create({
            data: {
              txNumber: billTxNumber(p, "KIRIM"),
              userId: owner.id,
              accountId: src.id,
              category: billCategory(p.jenis),
              amount: bill.tagihan,
              adminBank: 0,
              storeFee: 0,
              netProfit: 0,
              paymentMethod: "TRANSFER",
              status: "SUCCESS",
              customerName: p.nama,
              customerRef: p.noPel,
              notes: `Potongan tagihan ${p.jenis} periode ${p.bulan} ${
                p.status === "LUNAS" ? "(pelanggan juga sudah bayar)" : "(talangan)"
              }`,
              billId: bill.id,
              createdAt: bill.providerPaidAt,
            },
          }),
        ]);
        strukKirim++;
      } catch (e) {
        gagal.push(`Baris ${p.line}: kirim — ${e.message}`);
      }
    }

    if (kas && owner && p.status === "LUNAS" && bill.total && bill.customerPaidAt && !bill.cashApplied) {
      try {
        await prisma.$transaction([
          prisma.account.update({
            where: { id: kas.id },
            data: { balance: { increment: bill.total } },
          }),
          prisma.bill.update({
            where: { id: bill.id },
            data: { cashApplied: true },
          }),
          prisma.transaction.create({
            data: {
              txNumber: billTxNumber(p, "BYR"),
              userId: owner.id,
              accountId: kas.id,
              category: billCategory(p.jenis),
              amount: bill.tagihan,
              adminBank: 0,
              storeFee: bill.admin || 0,
              netProfit: bill.admin || 0,
              paymentMethod: "CASH",
              status: "SUCCESS",
              customerName: p.nama,
              customerRef: p.noPel,
              notes: `Pembayaran tagihan ${p.jenis} periode ${p.bulan}`,
              billId: bill.id,
              createdAt: bill.customerPaidAt,
            },
          }),
        ]);
        strukBayar++;
      } catch (e) {
        gagal.push(`Baris ${p.line}: pelanggan bayar — ${e.message}`);
      }
    }
  }

  // ---------- verifikasi akhir ----------
  const totalBulan = [...new Set(parsed.map((p) => p.bulan))];
  const dbBills = await prisma.bill.count();
  const dbCustomers = await prisma.customer.count();
  const dbNumbers = await prisma.customerNumber.count();

  const agg = await prisma.bill.aggregate({
    _sum: { tagihan: true, admin: true, total: true },
  });
  const byStatus = {};
  for (const st of ["LUNAS", "TALANGAN", "BELUM"]) {
    byStatus[st] = await prisma.bill.count({ where: { status: st } });
  }

  const sumTagihan = parsed.reduce((s, p) => s + (p.tagihan || 0), 0);
  const sumAdmin = parsed.reduce((s, p) => s + (p.admin || 0), 0);
  const sumTotal = parsed.reduce((s, p) => s + (p.total || 0), 0);

  console.log("======== IMPORT SELESAI ========");
  console.log(`Baris CSV   : ${parsed.length}`);
  console.log(`Bulan       : ${totalBulan.join(", ")}`);
  console.log(`Bills       : dibuat ${billsCreated}, diperbarui ${billsUpdated} (total di DB: ${dbBills})`);
  console.log(`Kontak      : dibuat ${customersCreated} (total di DB: ${dbCustomers})`);
  console.log(`No layanan  : dibuat ${numbersCreated} (total di DB: ${dbNumbers})`);
  console.log(`Status DB   : LUNAS=${byStatus.LUNAS} TALANGAN=${byStatus.TALANGAN} BELUM=${byStatus.BELUM}`);
  console.log(`Sum CSV     : tagihan=${sumTagihan} admin=${sumAdmin} total=${sumTotal}`);
  console.log(`Sum DB      : tagihan=${agg._sum.tagihan || 0} admin=${agg._sum.admin || 0} total=${agg._sum.total || 0}`);
  console.log(`Struk kirim   : dibuat ${strukKirim} (BRILink terpotong otomatis)`);
  console.log(`Struk pelanggan bayar: dibuat ${strukBayar} (Kasir masuk + untung admin)`);
  if (gagal.length > 0) {
    console.error("PERINGATAN: beberapa mutasi uang gagal dijalankan:");
    gagal.forEach((g) => console.error("  " + g));
  }
  if (sumTagihan !== (agg._sum.tagihan || 0) || sumAdmin !== (agg._sum.admin || 0)) {
    console.error("!!!!! MISMATCH: SUM DB != SUM CSV !!!!!");
    process.exit(1);
  }
  console.log("OK: sum DB sama dengan sum CSV.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
