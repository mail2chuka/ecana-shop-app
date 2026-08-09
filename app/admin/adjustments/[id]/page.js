'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader, PageHeader, Card, Modal, Field, FormButtons, inputCls, CurrencyInput, btnPrimaryCls } from '@/components/ui';
import { formatNaira, formatDateTime } from '@/lib/format';
import toast from 'react-hot-toast';

const blankEditForm = { amount: '', reason: '', confirmPin: '' };

export default function StandaloneAdjustmentDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [adj, setAdj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(blankEditForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/adjustments/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAdj(d.data); else toast.error(d.error || 'Failed to load'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    setEditForm({ amount: String(adj.amount), reason: adj.reason, confirmPin: '' });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/adjustments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`${label} updated`);
        setAdj(d.data);
        setShowEdit(false);
      } else {
        toast.error(d.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!adj) return <p className="text-gray-500">Adjustment not found</p>;

  const isSurcharge = adj.type === 'surcharge';
  const label = isSurcharge ? 'Surcharge' : 'Fund';

  return (
    <div>
      <PageHeader
        title={`${label} ${adj.referenceNumber}`}
        subtitle={`${formatDateTime(adj.appliedAt)} · Not tied to a transaction`}
        action={
          <div className="flex gap-2">
            <Link href={`/admin/adjustments/${id}/receipt`} className={btnPrimaryCls}>View Receipt</Link>
            {isAdmin && (
              <button onClick={openEdit} className={btnPrimaryCls}>Edit {label}</button>
            )}
          </div>
        }
      />

      <Card className="p-5 max-w-xl">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Customer</span>
            <Link href={`/admin/customers/${adj.customer}`} className="font-medium hover:underline">{adj.customerName}</Link>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Amount</span>
            <span className={`font-bold ${isSurcharge ? 'text-red-600' : 'text-green-600'}`}>
              {isSurcharge ? '+' : '-'}{formatNaira(adj.amount)}
            </span>
          </div>
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

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit ${label} ${adj.referenceNumber}`}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Field label="Amount (₦)" required>
            <CurrencyInput value={editForm.amount} onChange={val => setEditForm({ ...editForm, amount: val })} className={inputCls} required />
          </Field>
          <Field label="Reason" required>
            <textarea value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} rows={2} className={inputCls} required />
          </Field>
          <Field label="4-digit PIN" required>
            <input
              type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
              value={editForm.confirmPin}
              onChange={e => setEditForm({ ...editForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className={inputCls} required autoFocus
            />
          </Field>
          <FormButtons onCancel={() => setShowEdit(false)} submitting={saving} submitLabel="Save Changes" />
        </form>
      </Modal>
    </div>
  );
}
