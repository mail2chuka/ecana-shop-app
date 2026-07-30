'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, Field, inputCls, btnPrimaryCls } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ReceiptSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/organization');
    const d = await r.json();
    if (d.success) {
      setForm({
        bankName: d.data.bankName || '',
        accountNumber: d.data.accountNumber || '',
        accountName: d.data.accountName || '',
      });
    } else toast.error(d.error || 'Failed to load');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch('/api/organization', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) toast.success('Saved');
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <Loader />;

  return (
    <div>
      <PageHeader title="Receipt Settings" subtitle="Bank account shown at the bottom of every receipt" />

      <Card className="p-5 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Bank name">
            <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={inputCls} placeholder="e.g. GTBank" />
          </Field>
          <Field label="Account number">
            <input type="text" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Account name">
            <input type="text" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className={inputCls} placeholder="Name on the account" />
          </Field>
          <p className="text-xs text-gray-500">Leave blank to omit the bank details block from receipts entirely.</p>
          <div className="pt-2">
            <button type="submit" disabled={saving} className={btnPrimaryCls}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
