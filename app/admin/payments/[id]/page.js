'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader, PageHeader, Card, Modal, Field, FormButtons, inputCls, CurrencyInput, btnPrimaryCls } from '@/components/ui';
import { formatNaira, formatDateTime } from '@/lib/format';
import toast from 'react-hot-toast';

const METHOD_LABELS = { cash: 'Cash', transfer: 'Bank Transfer', pos: 'POS', cheque: 'Cheque' };

const blankEditForm = { amount: '', method: 'transfer', depositorName: '', bankName: '', description: '', date: '', confirmPin: '' };

export default function PaymentDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(blankEditForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/payments/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPayment(d.data); else toast.error(d.error || 'Failed to load'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    setEditForm({
      amount: String(payment.amount),
      method: payment.method,
      depositorName: payment.depositorName || '',
      bankName: payment.bankName || '',
      description: payment.description || '',
      date: new Date(payment.date).toISOString().split('T')[0],
      confirmPin: '',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('Payment updated');
        setPayment(d.data);
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
  if (!payment) return <p className="text-gray-500">Payment not found</p>;

  return (
    <div>
      <PageHeader
        title={`Payment ${payment.transactionNumber}`}
        subtitle={formatDateTime(payment.date)}
        action={
          <div className="flex gap-2">
            <Link href={`/admin/payments/${id}/receipt`} className={btnPrimaryCls}>View Receipt</Link>
            {isAdmin && <button onClick={openEdit} className={btnPrimaryCls}>Edit Payment</button>}
          </div>
        }
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

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Payment ${payment.transactionNumber}`}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Method" required>
              <select value={editForm.method} onChange={e => setEditForm({ ...editForm, method: e.target.value })} className={inputCls}>
                <option value="transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="pos">POS</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
            <Field label="Date" required>
              <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className={inputCls} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Depositor Name" required>
              <input type="text" value={editForm.depositorName} onChange={e => setEditForm({ ...editForm, depositorName: e.target.value })} className={inputCls} required />
            </Field>
            <Field label="Bank Name" required>
              <input type="text" value={editForm.bankName} onChange={e => setEditForm({ ...editForm, bankName: e.target.value })} className={inputCls} required />
            </Field>
          </div>
          <Field label="Amount (₦)" required>
            <CurrencyInput value={editForm.amount} onChange={val => setEditForm({ ...editForm, amount: val })} className={inputCls} required />
          </Field>
          <Field label="Remark">
            <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={inputCls} />
          </Field>
          <Field label="4-digit PIN" required>
            <input
              type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
              value={editForm.confirmPin}
              onChange={e => setEditForm({ ...editForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className={inputCls} required
            />
          </Field>
          <FormButtons onCancel={() => setShowEdit(false)} submitting={saving} submitLabel="Save Changes" />
        </form>
      </Modal>
    </div>
  );
}
