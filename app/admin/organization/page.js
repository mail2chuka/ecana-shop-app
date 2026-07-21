'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, Field, inputCls, btnPrimaryCls } from '@/components/ui';
import toast from 'react-hot-toast';

export default function OrganizationSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await fetch('/api/organization/logo', { method: 'POST', body });
      const d = await r.json();
      if (d.success) { setForm((f) => ({ ...f, logoUrl: d.data.logoUrl })); toast.success('Logo uploaded'); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setUploading(false);
      e.target.value = '';
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
          <Field label="Logo">
            <div className="flex items-center gap-4">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="Logo" className="h-16 w-16 object-contain border rounded bg-white" />
              ) : (
                <div className="h-16 w-16 border rounded flex items-center justify-center text-xs text-gray-400">No logo</div>
              )}
              <label className="px-4 py-2 border rounded text-sm cursor-pointer hover:bg-gray-50">
                {uploading ? 'Uploading...' : form.logoUrl ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">PNG, JPEG, WEBP, or SVG, up to 2MB. Uploads and saves immediately.</p>
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
