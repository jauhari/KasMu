export interface DenominationInput {
  denomination: number;
  sheetCount: number;
}

export const BANK_COMMISSION_RATE = 0.5;

export function calculateBankCommission(adminBank: number): number {
  return Number((adminBank * BANK_COMMISSION_RATE).toFixed(2));
}

export function calculateNetProfit(storeFee: number, adminBank: number): number {
  return Number((storeFee + calculateBankCommission(adminBank)).toFixed(2));
}

export function calculateOpnameTotal(sheets: DenominationInput[]): number {
  return sheets.reduce((sum, item) => sum + item.denomination * (item.sheetCount || 0), 0);
}

export function calculateOpnameDiscrepancy(totalCounted: number, targetCash: number): {
  discrepancy: number;
  status: "BALANCE" | "SURPLUS" | "DEFICIT";
} {
  const discrepancy = Number((totalCounted - targetCash).toFixed(2));
  if (discrepancy === 0) {
    return { discrepancy: 0, status: "BALANCE" };
  } else if (discrepancy > 0) {
    return { discrepancy, status: "SURPLUS" };
  } else {
    return { discrepancy, status: "DEFICIT" };
  }
}

export interface CashImpact {
  cashDrawerDelta: number;
  accountDelta: number;
}

export function calculateTransactionImpact(
  category: string,
  amount: number,
  adminBank: number,
  storeFee: number,
  paymentMethod: string = "CASH"
): CashImpact {
  // If payment method is CASH:
  // TARIK_TUNAI:
  // - Customer receives physical cash (amount) -> cash drawer -amount
  // - Customer pays fee in cash (+storeFee) or deducted
  // - Agent receives digital balance in provider (+amount)
  if (category === "TARIK_TUNAI") {
    const cashDelta = paymentMethod === "CASH" ? -(amount - storeFee) : 0;
    const accountDelta = amount - adminBank;
    return { cashDrawerDelta: cashDelta, accountDelta };
  }

  // SETOR_TUNAI, TRANSFER_BANK, TOPUP_EWALLET, PPOB:
  // - Customer pays: nominal + Fee BRILink + Fee Toko
  // - Agent provider balance transferred out: -(amount + adminBank)
  const cashDelta = paymentMethod === "CASH" ? amount + adminBank + storeFee : 0;
  const accountDelta = -(amount + adminBank);
  return { cashDrawerDelta: cashDelta, accountDelta };
}
