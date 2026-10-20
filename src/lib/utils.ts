import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);

  return isNegative ? `-${formatted}` : formatted;
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat("id-ID").format(val);
}

export function generateTxNumber(prefix: string = "TX"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}
