'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, StatusPill, btnPrimaryCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatNaira, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const ALL_MODULES = [
  { id: 'cement', label: 'Cement (ATC)' },
  { id: 'aggregate', label: 'Aggregate (Quarry)' },
  { id: 'shop', label: 'Shop' },
];

const blankForm = { orgName: '', adminName: '', adminUsername: '', adminPassword: '', enabledModules: ['cement', 'aggregate', 'shop'] };

const statusColor = { trialing: 'blue', active: 'green', past_due: 'amber', canceled: 'gray' };

export default function PlatformOrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/platform/organizations');
    const d = await r.json();
    if (d.success) setOrgs(d.data);
    else toast.error(d.error || 'Failed to load');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleModule = (id) => {
    setForm((f) => ({
      ...f,
      enabledModules: f.enabledModules.includes(id) ? f.enabledModules.filter((m) => m !== id) : [...f.enabledModules, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch('/api/platform/organizations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { toast.success('Organization created'); setShowModal(false); setForm(blankForm); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const totalRevenue = orgs.reduce((s, o) => s + (o.revenue || 0), 0);

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Every business using the platform"
        action={<button onClick={() => { setForm(blankForm); setShowModal(true); }} className={btnPrimaryCls}>Add Organization</button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><p className="text-xs text-gray-500">Organizations</p><p className="text-2xl font-bold mt-1">{orgs.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500">Paying / Trialing</p><p className="text-2xl font-bold mt-1">{orgs.filter(o => o.subscriptionStatus === 'active' || o.freeForever).length} / {orgs.filter(o => o.subscriptionStatus === 'trialing' && !o.freeForever).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500">Total Sales Volume</p><p className="text-2xl font-bold mt-1">{formatNaira(totalRevenue)}</p></Card>
      </div>

      {loading ? <Loader /> : (
        <Card className="overflow-hidden">
          <div className={tableScrollCls}>
            <table className="w-full text-sm min-w-[880px]">
              <thead className={theadCls}>
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Organization</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Modules</th>
                  <th className="px-4 py-3 text-right font-medium">Staff</th>
                  <th className="px-4 py-3 text-right font-medium">Customers</th>
                  <th className="px-4 py-3 text-right font-medium">Sales</th>
                  <th className="px-4 py-3 text-right font-medium">Volume</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orgs.length === 0 && <EmptyRow colSpan={8} text="No organizations yet" />}
                {orgs.map((o) => (
                  <tr key={o._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-gray-500">{o.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      {o.freeForever
                        ? <StatusPill status="Free forever" color="green" />
                        : <StatusPill status={o.subscriptionStatus} color={statusColor[o.subscriptionStatus] || 'gray'} />}
                      {!o.freeForever && o.subscriptionStatus === 'trialing' && o.trialEndsAt && (
                        <p className="text-xs text-gray-500 mt-1">trial ends {formatDate(o.trialEndsAt)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{(o.enabledModules || []).join(', ')}</td>
                    <td className="px-4 py-3 text-right">{o.staffCount}</td>
                    <td className="px-4 py-3 text-right">{o.customerCount}</td>
                    <td className="px-4 py-3 text-right">{o.salesCount}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNaira(o.revenue)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Organization">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">Creates a brand-new, isolated business workspace with its own admin login and a {14}-day trial.</p>
          <Field label="Business name" required>
            <input type="text" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} className={inputCls} required placeholder="e.g., Test Building Supplies" />
          </Field>
          <Field label="Modules">
            <div className="flex flex-wrap gap-3">
              {ALL_MODULES.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.enabledModules.includes(m.id)} onChange={() => toggleModule(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
          </Field>
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">First admin login</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Admin name" required>
                <input type="text" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Username" required>
                <input type="text" value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} className={inputCls} required />
              </Field>
            </div>
            <Field label="Password" required>
              <input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className={inputCls} required />
            </Field>
          </div>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} submitLabel="Create Organization" />
        </form>
      </Modal>
    </div>
  );
}
