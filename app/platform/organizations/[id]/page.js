'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, PageHeader, Card, Modal, FormButtons, Field, inputCls, StatusPill, btnPrimaryCls, theadCls, tableScrollCls, tableActionCls } from '@/components/ui';
import { formatNaira, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';
import { FiArrowLeft } from 'react-icons/fi';

const ALL_MODULES = [
  { id: 'cement', label: 'Cement (ATC)' },
  { id: 'aggregate', label: 'Aggregate (Quarry)' },
  { id: 'shop', label: 'Shop' },
];

const statusColor = { trialing: 'blue', active: 'green', past_due: 'amber', canceled: 'gray' };
const ROLE_LABELS = { admin: 'Admin', gsm_manager: 'GSM Manager', atc_manager: 'ATC Manager', auditor: 'Auditor' };

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/platform/organizations/${id}`);
    const d = await r.json();
    if (d.success) {
      setOrg(d.data);
      setForm({
        name: d.data.name,
        subscriptionStatus: d.data.subscriptionStatus,
        trialEndsAt: d.data.trialEndsAt ? d.data.trialEndsAt.split('T')[0] : '',
        freeForever: d.data.freeForever,
        enabledModules: d.data.enabledModules || [],
      });
    } else toast.error(d.error || 'Failed to load');
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const toggleModule = (mid) => {
    setForm((f) => ({
      ...f,
      enabledModules: f.enabledModules.includes(mid) ? f.enabledModules.filter((m) => m !== mid) : [...f.enabledModules, mid],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/platform/organizations/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, trialEndsAt: form.trialEndsAt || null }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Saved'); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const goingActive = !org.isActive;
    if (!confirm(goingActive ? `Reactivate ${org.name}? Staff will be able to log in again.` : `Suspend ${org.name}? Staff will not be able to log in until reactivated.`)) return;
    setTogglingActive(true);
    try {
      const r = await fetch(`/api/platform/organizations/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: goingActive }),
      });
      const d = await r.json();
      if (d.success) { toast.success(goingActive ? 'Reactivated' : 'Suspended'); load(); }
      else toast.error(d.error);
    } finally {
      setTogglingActive(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) return toast.error('Password must be at least 4 characters');
    setResetting(true);
    try {
      const r = await fetch(`/api/platform/organizations/${id}/users/${resetTarget._id}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`Password reset for ${resetTarget.name}`); setResetTarget(null); setNewPassword(''); }
      else toast.error(d.error);
    } finally {
      setResetting(false);
    }
  };

  if (loading || !org || !form) return <Loader />;

  return (
    <div>
      <Link href="/platform/organizations" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <FiArrowLeft size={14} /> All Organizations
      </Link>

      <PageHeader
        title={org.name}
        subtitle={org.slug}
        action={
          <button
            onClick={toggleActive}
            disabled={togglingActive}
            className={`px-4 py-2 rounded text-sm font-medium border disabled:opacity-50 ${org.isActive ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
          >
            {org.isActive ? 'Suspend Organization' : 'Reactivate Organization'}
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Status</p>
          <div className="mt-1">
            {org.isActive
              ? (org.freeForever ? <StatusPill status="Free forever" color="green" /> : <StatusPill status={org.subscriptionStatus} color={statusColor[org.subscriptionStatus] || 'gray'} />)
              : <StatusPill status="Suspended" color="red" />}
          </div>
        </Card>
        <Card className="p-4"><p className="text-xs text-gray-500">Staff</p><p className="text-2xl font-bold mt-1">{org.staff.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500">Customers</p><p className="text-2xl font-bold mt-1">{org.customerCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500">Sales Volume</p><p className="text-2xl font-bold mt-1">{formatNaira(org.revenue)}</p></Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-semibold text-sm mb-4">Organization Settings</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Business name" required>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
            </Field>
            <Field label="Subscription status">
              <select
                value={form.subscriptionStatus}
                onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
                className={inputCls}
                disabled={form.freeForever}
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <Field label="Trial ends">
              <input
                type="date" value={form.trialEndsAt} onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })}
                className={inputCls} disabled={form.freeForever}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={form.freeForever} onChange={(e) => setForm({ ...form, freeForever: e.target.checked })} />
              Free forever (exempt from trial/billing)
            </label>
          </div>

          <Field label="Enabled modules">
            <div className="flex flex-wrap gap-3">
              {ALL_MODULES.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.enabledModules.includes(m.id)} onChange={() => toggleModule(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
          </Field>

          <div className="pt-2">
            <button type="submit" disabled={saving} className={btnPrimaryCls}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b"><h3 className="font-semibold text-sm">Staff</h3></div>
        <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Login</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {org.staff.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email || u.username || u.phone || '-'}</td>
                  <td className="px-4 py-3"><StatusPill status={u.isActive ? 'Active' : 'Inactive'} color={u.isActive ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setResetTarget(u); setNewPassword(''); }} className={tableActionCls}>Reset Password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset password for ${resetTarget?.name || ''}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-500">Sets a new password directly — use this when a staff member is locked out and their own org admin can't help.</p>
          <Field label="New password" required>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} required minLength={4} />
          </Field>
          <FormButtons onCancel={() => setResetTarget(null)} submitting={resetting} submitLabel="Reset Password" />
        </form>
      </Modal>
    </div>
  );
}
