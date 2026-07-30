'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira, formatDate, formatDateTime } from '@/lib/format';
import { ReceiptHeader, ReceiptFooter, PaymentDetailsBox } from '@/components/ui';
import {
  createPdfRenderer, createImageRenderer, drawReceiptHeader, drawPaymentDetailsBox, drawTwoColumnInfo,
  drawKeyValueRow, drawTotalRow, drawNotesBlock, drawReceiptFooter, presentPdf, presentImage,
} from '@/lib/receiptRender';

const METHOD_LABELS = { cash: 'Cash', transfer: 'Bank Transfer', pos: 'POS', cheque: 'Cheque' };

export default function PaymentReceiptPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(null); // null | 'pdf' | 'jpg'

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

  const renderContent = async (ctx) => {
    let y = await drawReceiptHeader(ctx, { org, refNumber: payment.transactionNumber, date: formatDate(payment.date), title: 'Payment Receipt' });

    y = drawTwoColumnInfo(ctx, y, {
      label: 'Received From',
      lines: [payment.customerName],
    }, {
      label: 'Receipt Date',
      lines: [formatDateTime(payment.date)],
    });

    y = drawKeyValueRow(ctx, y, 'Method', `${METHOD_LABELS[payment.method] || payment.method}${payment.bankName ? ` (${payment.bankName})` : ''}`);
    y = drawKeyValueRow(ctx, y, 'Depositor', payment.depositorName || '—');
    if (payment.description) y = drawKeyValueRow(ctx, y, 'Description', payment.description);
    y = drawKeyValueRow(ctx, y, 'Balance before', formatNaira(payment.balanceBefore));
    y = drawKeyValueRow(ctx, y, 'Balance after', formatNaira(payment.balanceAfter));

    y = drawTotalRow(ctx, y, 'AMOUNT RECEIVED', formatNaira(payment.amount));
    y = drawPaymentDetailsBox(ctx, y, org);
    y = drawNotesBlock(ctx, y, [{ text: `Recorded by: ${payment.recordedByName}` }]);
    drawReceiptFooter(ctx, y, org);
  };

  const handleSharePdf = async () => {
    setSharing('pdf');
    try {
      const { pdf, ctx } = await createPdfRenderer();
      await renderContent(ctx);
      await presentPdf(pdf, `Payment-Receipt-${payment.transactionNumber}.pdf`, `Payment Receipt ${payment.transactionNumber}`);
    } catch (err) {
      toast.error(err.message || 'Could not generate PDF');
    } finally {
      setSharing(null);
    }
  };

  const handleShareJpg = async () => {
    setSharing('jpg');
    try {
      const { canvas, ctx } = await createImageRenderer();
      await renderContent(ctx);
      await presentImage(canvas, `Payment-Receipt-${payment.transactionNumber}.jpg`, `Payment Receipt ${payment.transactionNumber}`);
    } catch (err) {
      toast.error(err.message || 'Could not generate image');
    } finally {
      setSharing(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!payment) return <p className="text-gray-500 text-center py-12">Payment not found</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border rounded-lg p-8 print:border-0 print:p-0 print:shadow-none">
        <ReceiptHeader org={org} refNumber={payment.transactionNumber} date={formatDate(payment.date)} title="Payment Receipt" />

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

        <PaymentDetailsBox org={org} />

        <div className="border-t pt-4 text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">Recorded by:</span> {payment.recordedByName}</p>
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
