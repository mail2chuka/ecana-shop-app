'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, PageHeader, Card, btnPrimaryCls } from '@/components/ui';
import { formatNaira, formatDateTime } from '@/lib/format';
import toast from 'react-hot-toast';

export default function AdjustmentDetailPage() {
  const { id, adjId } = useParams();
  const [sale, setSale] = useState(null);
  const [adj, setAdj] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSale(d.data);
          setAdj((d.data.adjustments || []).find((a) => a._id === adjId) || null);
        } else toast.error(d.error || 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [id, adjId]);

  if (loading) return <Loader />;
  if (!sale || !adj) return <p className="text-gray-500">Adjustment not found</p>;

  const isSurcharge = adj.type === 'surcharge';
  const label = isSurcharge ? 'Surcharge' : 'Refund';

  return (
    <div>
      <PageHeader
        title={`${label} ${adj.referenceNumber}`}
        subtitle={formatDateTime(adj.appliedAt)}
        action={<Link href={`/admin/sales/${id}/adjustments/${adjId}/receipt`} className={btnPrimaryCls}>View Receipt</Link>}
      />

      <Card className="p-5 max-w-xl">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Customer</span>
            <Link href={`/admin/customers/${sale.customer}`} className="font-medium hover:underline">{sale.customerName}</Link>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Related Sale</span>
            <Link href={`/admin/sales/${id}`} className="font-medium hover:underline">{sale.saleNumber}</Link>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Amount</span>
            <span className={`font-bold ${isSurcharge ? 'text-red-600' : 'text-green-600'}`}>
              {isSurcharge ? '+' : '-'}{formatNaira(adj.amount)}
            </span>
          </div>
          {adj.method && (
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Method</span>
              <span className="font-medium capitalize">{adj.method.replace('_', ' ')}</span>
            </div>
          )}
          <div className="flex justify-between border-b pb-2 gap-4">
            <span className="text-gray-500 shrink-0">Reason</span>
            <span className="font-medium text-right">{adj.reason}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Balance before</span>
            <span className="font-medium">{formatNaira(adj.balanceBefore)}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Balance after</span>
            <span className="font-medium">{formatNaira(adj.balanceAfter)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Applied by</span>
            <span className="font-medium">{adj.appliedByName}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
