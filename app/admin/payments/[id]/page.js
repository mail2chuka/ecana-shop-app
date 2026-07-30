'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, PageHeader, Card, btnPrimaryCls } from '@/components/ui';
import { formatNaira, formatDateTime } from '@/lib/format';
import toast from 'react-hot-toast';

const METHOD_LABELS = { cash: 'Cash', transfer: 'Bank Transfer', pos: 'POS', cheque: 'Cheque' };

export default function PaymentDetailPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/payments/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPayment(d.data); else toast.error(d.error || 'Failed to load'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (!payment) return <p className="text-gray-500">Payment not found</p>;

  return (
    <div>
      <PageHeader
        title={`Payment ${payment.transactionNumber}`}
        subtitle={formatDateTime(payment.date)}
        action={<Link href={`/admin/payments/${id}/receipt`} className={btnPrimaryCls}>View Receipt</Link>}
      />

      <Card className="p-5 max-w-xl">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Customer</span>
            <Link href={`/admin/customers/${payment.customer}`} className="font-medium hover:underline">{payment.customerName}</Link>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Amount</span>
            <span className="font-bold text-green-600">{formatNaira(payment.amount)}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Method</span>
            <span className="font-medium">{METHOD_LABELS[payment.method] || payment.method}{payment.bankName ? ` (${payment.bankName})` : ''}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Depositor</span>
            <span className="font-medium">{payment.depositorName || '—'}</span>
          </div>
          {payment.description && (
            <div className="flex justify-between border-b pb-2 gap-4">
              <span className="text-gray-500 shrink-0">Remark</span>
              <span className="font-medium text-right">{payment.description}</span>
            </div>
          )}
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Balance before</span>
            <span className="font-medium">{formatNaira(payment.balanceBefore)}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Balance after</span>
            <span className="font-medium">{formatNaira(payment.balanceAfter)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Recorded by</span>
            <span className="font-medium">{payment.recordedByName}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
