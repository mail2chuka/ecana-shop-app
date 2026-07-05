'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput } from '@/components/ui';
import { formatNaira } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = {
  name: '', phone: '', address: '', businessName: '',
  openingBalance: 0, creditLimit: '',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    const r = await fetch(`/api/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`);
    const d = await r.json();
    if (d.success) setCustomers(d.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setEditing(null); setForm(blankForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, phone: c.phone, address: c.address || '',
      businessName: c.businessName || '', openingBalance: 0,
      creditLimit: c.creditLimit || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `/api/customers/${editing._id}` : '/api/customers';
      const method = editing ? 'PUT' : 'POST';
      const body = {
        name: form.name, phone: form.phone, address: form.address, businessName: form.businessName,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
      };
      if (!editing) body.openingBalance = Number(form.openingBalance) || 0;
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(editing ? 'Updated' : 'Created'); setShowModal(false); load(search); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    const r = await fetch(`/api/customers/${c._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success('Deleted'); load(search); }
    else toast.error(d.error);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer profiles and balances"
        action={<button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Add Customer</button>}
      />

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or business name..."
          className={inputCls + ' max-w-md'}
        />
      </div>

      {loading ? <Loader /> : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Business</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 && <EmptyRow colSpan={5} text="No customers found" />}
              {customers.map(c => (
                <tr key={c._id}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/customers/${c._id}`} className="hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{c.businessName || '-'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${c.balance < 0 ? 'text-red-600' : c.balance > 0 ? 'text-green-600' : ''}`}>
                    {formatNaira(c.balance)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/customers/${c._id}`} className="text-sm text-blue-600 hover:text-blue-800 mr-3">View</Link>
                    <button onClick={() => openEdit(c)} className="text-sm text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                    <button onClick={() => handleDelete(c)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Phone" required>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Business name">
            <input type="text" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Address">
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </Field>
          {!editing && (
            <Field label="Opening balance (₦)">
              <CurrencyInput value={form.openingBalance} onChange={val => setForm({ ...form, openingBalance: val })} className={inputCls} allowNegative />
              <p className="text-xs text-gray-500 mt-1">Positive = credit (we owe them). Negative = debt (they owe us).</p>
            </Field>
          )}
          <Field label="Credit limit (₦)">
            <CurrencyInput value={form.creditLimit} onChange={val => setForm({ ...form, creditLimit: val })} className={inputCls} placeholder="Leave blank for no limit" />
            <p className="text-xs text-gray-500 mt-1">Maximum amount this customer can owe.</p>
          </Field>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>
    </div>
  );
}
