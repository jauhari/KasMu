"use client";

import { formatRupiah } from "@/lib/utils";
import { Printer, X } from "lucide-react";

interface ReceiptProps {
  transaction: any;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, onClose }: ReceiptProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalBayar =
    transaction.category === "TARIK_TUNAI"
      ? transaction.amount - transaction.storeFee
      : transaction.amount + transaction.storeFee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-slate-100 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <span className="text-sm font-bold text-slate-300">Struk Transaksi Mini-ATM</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Layout */}
        <div
          id="printable-receipt"
          className="bg-white text-black p-5 rounded-lg shadow font-mono text-xs space-y-2 select-text"
        >
          <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
            <div className="font-extrabold text-sm uppercase">KASMU MINI-ATM</div>
            <div className="text-[10px] text-gray-600">Layanan Perbankan & Digital</div>
            <div className="text-[10px] text-gray-500">
              {new Date(transaction.createdAt).toLocaleString("id-ID")}
            </div>
            <div className="text-[9px] text-gray-400 font-bold">{transaction.txNumber}</div>
          </div>

          <div className="space-y-1 py-1 text-[11px]">
            <div className="flex justify-between">
              <span>Layanan:</span>
              <span className="font-bold">{transaction.category.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span>Provider:</span>
              <span>{transaction.account?.name || "Provider"}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span>Nasabah:</span>
                <span>{transaction.customerName}</span>
              </div>
            )}
            {transaction.customerRef && (
              <div className="flex justify-between">
                <span>No Ref/Rek:</span>
                <span>{transaction.customerRef}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Nominal:</span>
              <span>{formatRupiah(transaction.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Biaya Jasa:</span>
              <span>{formatRupiah(transaction.storeFee)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-xs border-t border-gray-300 pt-1">
              <span>TOTAL:</span>
              <span>{formatRupiah(totalBayar)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Status:</span>
              <span className="font-bold text-green-700">SUKSES BERHASIL</span>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-500">
            Terima kasih atas kepercayaan Anda.<br />
            Simpan struk ini sebagai bukti transaksi yang sah.
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/30"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Thermal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
