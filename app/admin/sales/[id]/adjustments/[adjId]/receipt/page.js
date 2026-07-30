'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatNaira, formatDate, formatDateTime } from '@/lib/format';

export default function AdjustmentReceiptPage() {
  const { id, adjId } = useParams();
  const [sale, setSale] = useState(null);
  const [adj, setAdj] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales/${id}`).then(r => r.json()),
      fetch('/api/organization').then(r => r.json()),
    ]).then(([s, o]) => {
      if (s.success) {
        setSale(s.data);
        setAdj((s.data.adjustments || []).find((a) => a._id === adjId) || null);
      }
      if (o.success) setOrg(o.data);
    }).finally(() => setLoading(false));
  }, [id, adjId]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!sale || !adj) return <p className="text-gray-500 text-center py-12">Adjustment not found</p>;

  const isSurcharge = adj.type === 'surcharge';
  const label = isSurcharge ? 'Surcharge' : 'Refund';

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
                <p className="text-xs text-gray-500 mt-0.5">{label} Receipt</p>
                {org?.address && <p className="text-xs text-gray-500 mt-1">{org.address}</p>}
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-xl">{adj.referenceNumber}</p>
              <p className="text-gray-600">{formatDate(adj.appliedAt)}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">{isSurcharge ? 'BILLED TO' : 'REFUNDED TO'}</p>
            <p className="font-bold text-lg">{sale.customerName}</p>
            {sale.customerPhone && <p className="text-sm text-gray-600">{sale.customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium mb-1">RELATED SALE</p>
            <p className="text-sm">{sale.saleNumber}</p>
            <p className="text-xs text-gray-500">{formatDateTime(adj.appliedAt)}</p>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full text-sm">
            <tbody>
              {adj.method && (
                <tr className="border-b border-gray-200">
                  <td className="px-2 py-3 text-gray-600">Method</td>
                  <td className="px-2 py-3 text-right font-medium capitalize">{adj.method.replace('_', ' ')}</td>
                </tr>
              )}
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Reason</td>
                <td className="px-2 py-3 text-right font-medium">{adj.reason}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Balance before</td>
                <td className="px-2 py-3 text-right font-medium">{formatNaira(adj.balanceBefore)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-3 text-gray-600">Balance after</td>
                <td className="px-2 py-3 text-right font-medium">{formatNaira(adj.balanceAfter)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className={`flex justify-between py-3 text-lg font-bold border-b-2 border-gray-900 ${isSurcharge ? 'text-red-600' : 'text-green-600'}`}>
              <span>{label.toUpperCase()}</span>
              <span>{isSurcharge ? '+' : '-'}{formatNaira(adj.amount)}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">Applied by:</span> {adj.appliedByName}</p>
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
