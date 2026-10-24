import { describe, it, expect } from "vitest";
import {
  calculateNetProfit,
  calculateOpnameTotal,
  calculateOpnameDiscrepancy,
  calculateTransactionImpact,
} from "../src/lib/accounting";

describe("Accounting Engine Mini-ATM", () => {
  it("should calculate net profit correctly (Fee Toko - Admin Bank)", () => {
    // Fee toko Rp 10.000, Admin bank Rp 2.500 -> Profit Rp 7.500
    expect(calculateNetProfit(10000, 2500)).toBe(7500);

    // Fee toko Rp 5.000, Admin bank Rp 5.000 -> Profit Rp 0
    expect(calculateNetProfit(5000, 5000)).toBe(0);

    // Free promo or error where admin > fee
    expect(calculateNetProfit(2000, 2500)).toBe(-500);
  });

  it("should calculate total physical cash from sheet denominations", () => {
    const sheets = [
      { denomination: 100000, sheetCount: 30 }, // 3.000.000
      { denomination: 50000, sheetCount: 14 },  // 700.000
      { denomination: 20000, sheetCount: 1 },   // 20.000
      { denomination: 10000, sheetCount: 1 },   // 10.000
      { denomination: 2000, sheetCount: 1 },    // 2.000
    ];
    expect(calculateOpnameTotal(sheets)).toBe(3732000);
  });

  it("should calculate opname discrepancy accurately", () => {
    // Exact match
    const balanceResult = calculateOpnameDiscrepancy(3732000, 3732000);
    expect(balanceResult.discrepancy).toBe(0);
    expect(balanceResult.status).toBe("BALANCE");

    // Surplus (uang fisik lebih banyak dari target kas sistem)
    const surplusResult = calculateOpnameDiscrepancy(3732000, 3731370);
    expect(surplusResult.discrepancy).toBe(630);
    expect(surplusResult.status).toBe("SURPLUS");

    // Deficit (uang fisik kurang dari target sistem)
    const deficitResult = calculateOpnameDiscrepancy(3700000, 3732000);
    expect(deficitResult.discrepancy).toBe(-32000);
    expect(deficitResult.status).toBe("DEFICIT");
  });

  it("should calculate Setor Tunai impact on cash drawer and provider balance", () => {
    // Setor Tunai Rp 1.000.000, Fee Toko 10.000, Admin Bank 2.500
    const impact = calculateTransactionImpact("SETOR_TUNAI", 1000000, 2500, 10000, "CASH");
    // Kasir terima uang Rp 1.010.000 (uang transaksi + fee)
    expect(impact.cashDrawerDelta).toBe(1010000);
    // Saldo provider berkurang Rp 1.002.500 (uang transaksi + biaya admin dipotong bank)
    expect(impact.accountDelta).toBe(-1002500);
  });

  it("should calculate Tarik Tunai impact on cash drawer and provider balance", () => {
    // Tarik Tunai Rp 500.000, Fee Toko 5.000, Admin Bank 0
    const impact = calculateTransactionImpact("TARIK_TUNAI", 500000, 0, 5000, "CASH");
    // Kasir serahkan Rp 495.000 (Rp 500rb dikurangi fee Rp 5rb)
    expect(impact.cashDrawerDelta).toBe(-495000);
    // Rekening/provider agen bertambah Rp 500.000
    expect(impact.accountDelta).toBe(500000);
  });
});
