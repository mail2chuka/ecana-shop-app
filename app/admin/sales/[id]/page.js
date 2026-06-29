'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira, formatDate, formatDateTime } from '@/lib/format';

export default function SaleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const formatAtcNumber = (item) => {
    if (!item.itemType === 'cement' || !item.cementBrand) return item.atcNumber;
    const brand = brands.find(b => b._id === item.cementBrand);
    const abbr = brand?.abbreviation || '???';
    return `${abbr}-${item.atcNumber}`;
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales/${id}`).then(r => r.json()),
      fetch('/api/cement-brands').then(r => r.json()),
    ]).then(([d, b]) => {
      if (d.success) setSale(d.data);
      if (b.success) setBrands(b.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    const res = await fetch(`/api/sales/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    });
    const data = await res.json();
    setCancelling(false);
    if (data.success) {
      toast.success('Sale cancelled');
      setSale(data.data);
      setShowCancel(false);
    } else {
      toast.error(data.error);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!sale) return <p className="text-gray-500">Sale not found</p>;

  return (
    <div className="max-w-3xl">
      {/* Screen header */}
      <div className="flex justify-between items-start mb-6 no-print">
        <div>
          <h1 className="text-xl font-bold">{sale.saleNumber}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(sale.date)} · {sale.saleType}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Print Invoice</button>
          {sale.status === 'active' && (
            <button onClick={() => setShowCancel(true)} className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50">Cancel Sale</button>
          )}
        </div>
      </div>

      {sale.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 no-print">
          <p className="text-red-700 font-medium text-sm">This sale was cancelled</p>
          {sale.cancellationReason && <p className="text-red-600 text-xs mt-1">Reason: {sale.cancellationReason}</p>}
        </div>
      )}

      {/* Printable Invoice */}
      <div className="bg-white border rounded-lg p-6 print:border-0 print:p-0">
        {/* Print Header */}
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-sm text-gray-500 mt-1">Ecana Materials</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-lg">{sale.saleNumber}</p>
              <p className="text-gray-500">{formatDate(sale.date)}</p>
              <p className={`font-medium mt-1 ${sale.status === 'cancelled' ? 'text-red-600' : 'text-green-600'}`}>
                {sale.status.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Delivery */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">BILL TO</p>
            <p className="font-semibold">{sale.customerName}</p>
            {sale.customerPhone && <p className="text-gray-600">{sale.customerPhone}</p>}
          </div>
          {sale.truckPlate && (
            <div>
              <p className="text-xs text-gray-500 mb-1">DELIVERY</p>
              <p className="font-medium">{sale.truckPlate}</p>
              {sale.driverName && <p className="text-gray-600">Driver: {sale.driverName}</p>}
            </div>
          )}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Description</th>
              <th className="py-2 text-right">Bill Qty</th>
              <th className="py-2 text-right">Actual Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sale.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2">
                  {item.itemType === 'cement' ? (
                    <>
                      <p className="font-medium">{item.cementBrandName} Cement</p>
                      <p className="text-xs text-gray-500">ATC: {formatAtcNumber(item)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{item.quarryName} — {item.size}</p>
                      <p className="text-xs text-gray-500">Stone Dust / Quarry Product</p>
                    </>
                  )}
                </td>
                <td className="py-2 text-right">{item.billQuantity} {item.itemType === 'cement' ? 'bags' : 'tonnes'}</td>
                <td className="py-2 text-right">{item.actualQuantity} {item.itemType === 'cement' ? 'bags' : 'tonnes'}</td>
                <td className="py-2 text-right">{formatNaira(item.unitPrice)}</td>
                <td className="py-2 text-right font-medium">{formatNaira(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatNaira(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatNaira(sale.discount)}</span>
              </div>
            )}
            {sale.transportFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Transport</span>
                <span>{formatNaira(sale.transportFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Grand Total</span>
              <span>{formatNaira(sale.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Balance snapshot */}
        <div className="mt-6 border-t pt-4 text-xs text-gray-500">
          <p>Balance before: {formatNaira(sale.balanceBefore)} → Balance after: <span className={sale.balanceAfter < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{formatNaira(sale.balanceAfter)}</span></p>
          {sale.notes && <p className="mt-1">Notes: {sale.notes}</p>}
          <p className="mt-1">Recorded by: {sale.createdByName}</p>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Cancel Sale</h2>
            <p className="text-sm text-gray-500 mb-4">This will reverse the balance deduction and restore ATC bags.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..." rows={3}
              className="w-full px-3 py-2 border rounded text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 px-4 py-2 border rounded text-sm">Go Back</button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
