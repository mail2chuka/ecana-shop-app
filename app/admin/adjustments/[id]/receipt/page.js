'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira, formatDate, formatDateTime } from '@/lib/format';
import { ReceiptHeader, ReceiptFooter, PaymentDetailsBox } from '@/components/ui';
import { shareReceiptAsPdf, shareReceiptAsJpg } from '@/lib/receiptCapture';

export default function StandaloneAdjustmentReceiptPage() {
  const { id } = useParams();
  const [adj, setAdj] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(null); // null | 'pdf' | 'jpg'

  useEffect(() => {
    Promise.all([
      fetch(`/api/adjustments/${id}`).then(r => r.json()),
      fetch('/api/organization').then(r => r.json()),
    ]).then(([a, o]) => {
      if (a.success) setAdj(a.data);
      if (o.success) setOrg(o.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!adj) return <p className="text-gray-500 text-center py-12">Adjustment not found</p>;

  const isSurcharge = adj.type === 'surcharge';
  const label = isSurcharge ? 'Surcharge' : 'Fund';

  const handleSharePdf = async () => {
    setSharing('pdf');
    try {
      await shareReceiptAsPdf('receipt-content', `${label}-Receipt-${adj.referenceNumber}.pdf`, `${label} Receipt ${adj.referenceNumber}`);
    } catch (err) {
      toast.error(err.message || 'Could not generate PDF');
    } finally {
      setSharing(null);
    }
  };

  const handleShareJpg = async () => {
    setSharing('jpg');
    try {
      await shareReceiptAsJpg('receipt-content', `${label}-Receipt-${adj.referenceNumber}.jpg`, `${label} Receipt ${adj.referenceNumber}`);
    } catch (err) {
      toast.error(err.message || 'Could not generate image');
    } finally {
      setSharing(null);
    }
  };

  return (
    <div className="receipt-page mx-auto">
      <div id="receipt-content" className="bg-white border rounded-lg p-8 min-h-[297mm] print:border-0 print:p-0 print:shadow-none">
        <ReceiptHeader org={org} refNumber={adj.referenceNumber} date={formatDate(adj.appliedAt)} title={`${label} Receipt`} />

        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">{isSurcharge ? 'BILLED TO' : 'FUNDED TO'}</p>
            <p className="font-bold text-lg">{adj.customerName}</p>
            {adj.customerPhone && <p className="text-sm text-gray-600">{adj.customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium mb-1">RELATED TRANSACTION</p>
            <p className="text-sm text-gray-500">Not tied to a transaction</p>
            <p className="text-xs text-gray-500">{formatDateTime(adj.appliedAt)}</p>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full text-sm">
            <tbody>
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

        <PaymentDetailsBox org={org} />

        <div className="border-t pt-4 text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">Applied by:</span> {adj.appliedByName}</p>
        </div>

        <ReceiptFooter org={org} />
      </div>

      <div className="mt-6 flex justify-center gap-3 no-print">
        <button onClick={handlePrint} className="px-6 py-2 bg-green-800 text-neutral-100 rounded hover:bg-green-900">
          Print Receipt
        </button>
        <button onClick={handleSharePdf} disabled={!!sharing} className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50">
          {sharing === 'pdf' ? 'Preparing...' : 'Share PDF'}
        </button>
        <button onClick={handleShareJpg} disabled={!!sharing} className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50">
          {sharing === 'jpg' ? 'Preparing...' : 'Share JPG'}
        </button>
        <button onClick={() => window.history.back()} className="px-6 py-2 border rounded hover:bg-gray-50">
          Back
        </button>
      </div>
    </div>
  );
}
