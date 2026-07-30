'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatNaira, formatDate, formatDateTime } from '@/lib/format';

const METHOD_LABELS = { cash: 'Cash', transfer: 'Bank Transfer', pos: 'POS', cheque: 'Cheque' };

export default function PaymentReceiptPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/payments/${id}`).then(r => r.json()),
      fetch('/api/organization').then(r => r.json()),
    ]).then(([p, o]) => {
      if (p.success) setPayment(p.data);
      if (o.success) setOrg(o.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!payment) return <p className="text-gray-500 text-center py-12">Payment not found</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border rounded-lg p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="border-b pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              {org?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt={org.name} className="h-14 w-14 object-contain rounded" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{org?.name || ''}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Payment Receipt</p>
                {org?.address && <p className="text-xs text-gray-500 mt-1">{org.address}</p>}
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-xl">{payment.transactionNumber}</p>
              <p className="text-gray-600">{formatDate(payment.date)}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">RECEIVED FROM</p>
            <p className="font-bold text-lg">{payment.customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium mb-1">RECEIPT DATE</p>
            <p className="text-sm">{formatDateTime(payment.date)}</p>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Method</td>
                <td className="px-2 py-3 text-right font-medium">{METHOD_LABELS[payment.method] || payment.method}{payment.bankName ? ` (${payment.bankName})` : ''}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Depositor</td>
                <td className="px-2 py-3 text-right font-medium">{payment.depositorName || '—'}</td>
              </tr>
              {payment.description && (
                <tr className="border-b border-gray-200">
                  <td className="px-2 py-3 text-gray-600">Description</td>
                  <td className="px-2 py-3 text-right font-medium">{payment.description}</td>
                </tr>
              )}
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Balance before</td>
                <td className="px-2 py-3 text-right font-medium">{formatNaira(payment.balanceBefore)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Balance after</td>
                <td className="px-2 py-3 text-right font-medium">{formatNaira(payment.balanceAfter)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-3 text-lg font-bold border-b-2 border-gray-900">
              <span>AMOUNT RECEIVED</span>
              <span>{formatNaira(payment.amount)}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">Recorded by:</span> {payment.recordedByName}</p>
        </div>

        <div className="mt-6 pt-4 text-center text-xs text-gray-400">
          {org?.invoiceFooter || 'Thank you for your business.'}
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3 no-print">
        <button onClick={handlePrint} className="px-6 py-2 bg-green-800 text-neutral-100 rounded hover:bg-green-900">
          Print Receipt
        </button>
        <button onClick={() => window.history.back()} className="px-6 py-2 border rounded hover:bg-gray-50">
          Back
        </button>
      </div>
    </div>
  );
}
