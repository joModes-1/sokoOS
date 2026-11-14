'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  saleNumber: string;
  createdAt: string;
  businessName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  tinNumber?: string;
  customerName?: string;
  items: { name: string; qty: number; unitPriceMinor: number; totalMinor: number }[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  payments: { method: string; status: string; amountMinor: number; tenderedMinor?: number; changeMinor?: number }[];
  cashierName: string;
  footerText: string;
}

const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', MTN_MOMO: 'MTN MoMo', AIRTEL_MONEY: 'Airtel Money' };

function Dashed() {
  return <div className="border-t border-dashed border-black my-2" />;
}

function ReceiptContent() {
  const { id } = useParams<{ id: string }>();
  const autoPrint = useSearchParams().get('autoprint') === '1';

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => api.get<ReceiptData>(`/sales/${id}/receipt`),
    retry: false,
  });

  useEffect(() => {
    if (receipt && autoPrint) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [receipt, autoPrint]);

  if (isLoading) return <div className="p-8 text-center text-sm">Loading receipt…</div>;
  if (error || !receipt) {
    return <div className="p-8 text-center text-sm" data-testid="receipt-error">Receipt not found</div>;
  }

  return (
    <div className="receipt max-w-[80mm] mx-auto p-4 font-mono text-[12px] leading-snug text-black bg-white" data-testid="receipt">
      <style>{`
        @page { size: 80mm auto; margin: 3mm; }
        @media print {
          html, body { background: #fff !important; margin: 0; }
          .receipt { padding: 0 !important; max-width: none !important; }
        }
      `}</style>

      <div className="text-center">
        <h1 className="text-base font-bold uppercase">{receipt.businessName}</h1>
        <p>{receipt.branchName}</p>
        {receipt.branchAddress && <p>{receipt.branchAddress}</p>}
        {receipt.branchPhone && <p>Tel: {receipt.branchPhone}</p>}
        {receipt.tinNumber && <p>TIN: {receipt.tinNumber}</p>}
      </div>

      <Dashed />

      <div>
        <div className="flex justify-between"><span>Receipt #</span><span className="font-bold" data-testid="receipt-number">{receipt.receiptNumber}</span></div>
        <div className="flex justify-between"><span>Sale #</span><span>{receipt.saleNumber}</span></div>
        <div className="flex justify-between"><span>Date</span><span>{formatDate(receipt.createdAt)}</span></div>
        {receipt.customerName && <div className="flex justify-between"><span>Customer</span><span>{receipt.customerName}</span></div>}
      </div>

      <Dashed />

      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th className="pb-1 font-bold">Item</th>
            <th className="pb-1 text-center font-bold">Qty</th>
            <th className="pb-1 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="pr-1">
                {item.name}
                <div className="text-[10px]">@ {formatMoney(item.unitPriceMinor)}</div>
              </td>
              <td className="text-center">{item.qty}</td>
              <td className="text-right">{formatMoney(item.totalMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dashed />

      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(receipt.subtotalMinor)}</span></div>
        {receipt.discountMinor > 0 && (
          <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(receipt.discountMinor)}</span></div>
        )}
        {receipt.taxMinor > 0 && (
          <div className="flex justify-between"><span>Tax</span><span>{formatMoney(receipt.taxMinor)}</span></div>
        )}
        <div className="flex justify-between text-sm font-bold pt-1">
          <span>TOTAL</span><span data-testid="receipt-total">{formatMoney(receipt.totalMinor)}</span>
        </div>
      </div>

      <Dashed />

      <div className="space-y-0.5">
        {receipt.payments.map((p, i) => (
          <div key={i}>
            <div className="flex justify-between">
              <span>{METHOD_LABEL[p.method] ?? p.method}{p.status === 'PENDING' ? ' (pending)' : ''}</span>
              <span>{formatMoney(p.amountMinor)}</span>
            </div>
            {p.tenderedMinor != null && (
              <div className="flex justify-between"><span>Cash received</span><span>{formatMoney(p.tenderedMinor)}</span></div>
            )}
            {p.changeMinor != null && p.changeMinor > 0 && (
              <div className="flex justify-between font-bold"><span>Change</span><span>{formatMoney(p.changeMinor)}</span></div>
            )}
          </div>
        ))}
      </div>

      <Dashed />

      <div className="text-center">
        <p>Served by: {receipt.cashierName}</p>
        <p className="mt-2 font-bold">{receipt.footerText}</p>
        <p className="mt-1 text-[10px]">Powered by SokoOS</p>
      </div>

      <div className="mt-6 text-center print:hidden">
        <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2 rounded text-sm">
          Print receipt
        </button>
      </div>
    </div>
  );
}

export default function ReceiptPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading receipt…</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
