'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatNaira, formatDate, formatDateTime, formatSaleTypeLabel, saleItemUnitLabel } from '@/lib/format';

export default function SaleInvoicePage() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales/${id}`).then(r => r.json()),
      fetch('/api/organization').then(r => r.json()),
    ]).then(([s, o]) => {
      if (s.success) setSale(s.data);
      if (o.success) setOrg(o.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!sale) return <p className="text-gray-500 text-center py-12">Sale not found</p>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Print Header */}
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
                <p className="text-xs text-gray-500 mt-0.5">{formatSaleTypeLabel(sale.saleType)}</p>
                {org?.address && <p className="text-xs text-gray-500 mt-1">{org.address}</p>}
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-xl">{sale.saleNumber}</p>
              <p className="text-gray-600">{formatDate(sale.date)}</p>
              {sale.status === 'cancelled' && (
                <p className="font-bold mt-2 text-amber-700">CANCELLED</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">BILL TO</p>
            <p className="font-bold text-lg">{sale.customerName}</p>
            {sale.customerPhone && <p className="text-sm text-gray-600">{sale.customerPhone}</p>}
            {sale.customerAddress && <p className="text-sm text-gray-600">{sale.customerAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium mb-1">INVOICE DATE</p>
            <p className="text-sm">{formatDateTime(sale.date)}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="px-2 py-2 text-left font-bold">Description</th>
                <th className="px-2 py-2 text-right font-bold">QTY</th>
                <th className="px-2 py-2 text-right font-bold">Unit Price</th>
                <th className="px-2 py-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="px-2 py-3">
                    {item.itemType === 'cement' ? (
                      <>
                        <p className="font-medium">{item.cementBrandName} Cement</p>
                        <p className="text-xs text-gray-500">ATC: {item.atcNumber}</p>
                      </>
                    ) : item.itemType === 'shop' ? (
                      <>
                        <p className="font-medium">{item.shopProductName}</p>
                        {item.cementBrandName && <p className="text-xs text-gray-500">{item.cementBrandName}</p>}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{item.quarryName} — {item.size}</p>
                        <p className="text-xs text-gray-500">Aggregate</p>
                      </>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {item.billQuantity} {saleItemUnitLabel(item)}
                  </td>
                  <td className="px-2 py-3 text-right">{formatNaira(item.unitPrice)}</td>
                  <td className="px-2 py-3 text-right font-medium">{formatNaira(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatNaira(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between py-2 text-green-600 border-b border-gray-300">
                <span>Discount</span>
                <span>-{formatNaira(sale.discount)}</span>
              </div>
            )}
            {(sale.transportFee > 0 || sale.transportHandledBy) && (
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="text-gray-600">
                  Transport{sale.transportHandledBy === 'customer' ? ' (by customer)' : sale.transportMeans ? ` (${sale.transportMeans})` : ''}
                </span>
                <span className="font-medium">
                  {sale.transportHandledBy === 'customer' ? '—' : formatNaira(sale.transportFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-3 text-lg font-bold border-b-2 border-gray-900">
              <span>TOTAL</span>
              <span>{formatNaira(sale.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-4 text-xs text-gray-600 space-y-1">
          {sale.notes && <p><span className="font-medium">Notes:</span> {sale.notes}</p>}
          <p className="pt-2"><span className="font-medium">Recorded by:</span> {sale.createdByName}</p>
          {sale.status === 'cancelled' && (
            <p className="text-amber-700 font-medium pt-2">
              ⚠ This invoice has been cancelled{sale.cancellationReason && ` - ${sale.cancellationReason}`}
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 text-center text-xs text-gray-400">
          {org?.invoiceFooter || 'Thank you for your business.'}
        </div>
      </div>

      {/* Print Button */}
      <div className="mt-6 flex justify-center gap-3 no-print">
        <button onClick={handlePrint} className="px-6 py-2 bg-green-800 text-neutral-100 rounded hover:bg-green-900">
          Print Invoice
        </button>
        <button onClick={() => window.history.back()} className="px-6 py-2 border rounded hover:bg-gray-50">
          Back
        </button>
      </div>
    </div>
  );
}
