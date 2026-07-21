'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, Field, inputCls, btnPrimaryCls } from '@/components/ui';
import toast from 'react-hot-toast';

export default function OrganizationSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/organization');
    const d = await r.json();
    if (d.success) {
      setForm({
        name: d.data.name || '',
        logoUrl: d.data.logoUrl || '',
        address: d.data.address || '',
        invoiceFooter: d.data.invoiceFooter || '',
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
      <PageHeader title="Organization Settings" subtitle="Your business name and branding" />

      <Card className="p-5 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Business name" required>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Address">
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Shown on invoices and statements" />
          </Field>
          <Field label="Logo URL">
            <input type="text" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className={inputCls} placeholder="https://..." />
          </Field>
          <Field label="Invoice / statement footer">
            <textarea
              value={form.invoiceFooter} onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
              className={inputCls} rows={3} placeholder="e.g. Thank you for your business."
            />
          </Field>
          <div className="pt-2">
            <button type="submit" disabled={saving} className={btnPrimaryCls}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
