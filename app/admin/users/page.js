'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, StatusPill, btnPrimaryCls, btnDangerCls, tableActionCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatCustomerLabel } from '@/lib/format';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  admin: 'Admin',
  gsm_manager: 'GSM Manager',
  atc_manager: 'ATC Manager',
  customer: 'Customer',
};

const blankForm = { name: '', role: 'gsm_manager', email: '', username: '', phone: '', password: '', linkedCustomer: null };
const blankPinForm = { currentPassword: '', newPin: '', confirmPin: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState(blankPinForm);
  const [submittingPin, setSubmittingPin] = useState(false);

  const load = async () => {
    setLoading(true);
    const [u, c] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]);
    if (u.success) setUsers(u.data);
    if (c.success) setCustomers(c.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(blankForm);
    setCustomerSearch('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name, role: u.role, email: u.email || '', username: u.username || '',
      phone: u.phone || '', password: '', linkedCustomer: u.linkedCustomer?._id || null,
    });
    setCustomerSearch(u.linkedCustomer ? formatCustomerLabel(u.linkedCustomer) : '');
    setShowModal(true);
  };

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      )
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const body = { name: form.name };
        if (form.password) body.password = form.password;
        const r = await fetch(`/api/users/${editingUser._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (d.success) { toast.success('Updated'); setShowModal(false); load(); }
        else toast.error(d.error);
      } else {
        const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const d = await r.json();
        if (d.success) { toast.success('User created'); setShowModal(false); load(); }
        else toast.error(d.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pinForm.newPin !== pinForm.confirmPin) return toast.error('PINs do not match');
    setSubmittingPin(true);
    try {
      const r = await fetch('/api/users/pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pinForm.currentPassword, newPin: pinForm.newPin }),
      });
      const d = await r.json();
      if (d.success) { toast.success('PIN updated'); setShowPinModal(false); setPinForm(blankPinForm); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmittingPin(false);
    }
  };

  const toggleActive = async (u) => {
    if (!confirm(`${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.name}?`)) return;
    const r = await fetch(`/api/users/${u._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) });
    const d = await r.json();
    if (d.success) { toast.success(u.isActive ? 'Deactivated' : 'Reactivated'); load(); }
    else toast.error(d.error);
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Staff and customer logins"
        action={
          <div className="flex gap-2">
            <button onClick={() => { setPinForm(blankPinForm); setShowPinModal(true); }} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Set/Change My PIN</button>
            <button onClick={openCreate} className={btnPrimaryCls}>Add User</button>
          </div>
        }
      />

      {loading ? <Loader /> : (
        <Card className="overflow-hidden">
          <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Login</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 && <EmptyRow colSpan={5} text="No users found" />}
              {users.map(u => (
                <tr key={u._id}>
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {u.linkedCustomer && <p className="text-xs text-gray-500 font-normal">Linked: {formatCustomerLabel(u.linkedCustomer)}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email || u.username || u.phone || '-'}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-3"><StatusPill status={u.isActive ? 'Active' : 'Inactive'} color={u.isActive ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className={`${tableActionCls} mr-3`}>Edit</button>
                    <button onClick={() => toggleActive(u)} className={u.isActive ? 'text-sm font-medium text-amber-700 hover:text-amber-800' : tableActionCls}>
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </Field>

          {!editingUser && (
            <Field label="Role" required>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputCls} required>
                <option value="gsm_manager">GSM Manager</option>
                <option value="atc_manager">ATC Manager</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
            </Field>
          )}

          {editingUser && (
            <p className="text-sm text-gray-500">Role: {ROLE_LABELS[form.role]} (role can't be changed after creation — deactivate and create a new login instead)</p>
          )}

          {!editingUser && form.role !== 'customer' && (
            <>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Username">
                <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className={inputCls} />
              </Field>
              <p className="text-xs text-gray-500 -mt-2">At least one of email or username is required.</p>
            </>
          )}

          {!editingUser && form.role === 'customer' && (
            <>
              <Field label="Customer" required>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                    onFocus={() => setShowCustomerDrop(true)}
                    placeholder="Search customer by name or phone..."
                    className={inputCls}
                  />
                  {showCustomerDrop && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, linkedCustomer: c._id, phone: form.phone || c.phone });
                            setCustomerSearch(formatCustomerLabel(c));
                            setShowCustomerDrop(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-0"
                        >
                          <p className="font-medium">{formatCustomerLabel(c)}</p>
                          <p className="text-xs text-gray-500">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Login Phone" required>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} required />
              </Field>
            </>
          )}

          <Field label={editingUser ? 'Reset Password (leave blank to keep current)' : (form.role === 'customer' ? 'PIN' : 'Password')} required={!editingUser}>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputCls} required={!editingUser} />
          </Field>

          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>

      <Modal open={showPinModal} onClose={() => setShowPinModal(false)} title="Set/Change My PIN">
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">This 4-digit PIN is required to apply a surcharge or refund on a sale. It's separate from your login password.</p>
          <Field label="Your current password" required>
            <input type="password" value={pinForm.currentPassword} onChange={e => setPinForm({ ...pinForm, currentPassword: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="New 4-digit PIN" required>
            <input
              type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
              value={pinForm.newPin}
              onChange={e => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className={inputCls} required
            />
          </Field>
          <Field label="Confirm new PIN" required>
            <input
              type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
              value={pinForm.confirmPin}
              onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className={inputCls} required
            />
          </Field>
          <FormButtons onCancel={() => setShowPinModal(false)} submitting={submittingPin} submitLabel="Save PIN" />
        </form>
      </Modal>
    </div>
  );
}
