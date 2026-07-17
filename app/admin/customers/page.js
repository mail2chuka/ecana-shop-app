'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput, btnPrimaryCls, btnDangerCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatNaira, formatCustomerLabel } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = {
  name: '', phone: '', address: '', businessName: '',
  openingBalance: 0, creditLimit: '',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const load = async (q = '', status = statusFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ status });
    if (q) params.set('search', q);
    const r = await fetch(`/api/customers?${params.toString()}`);
    const d = await r.json();
    if (d.success) setCustomers(d.data);
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => { load(search, statusFilter); }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setForm(blankForm); setShowModal(true); };

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.size === customers.length ? new Set() : new Set(customers.map(c => c._id)));
  };

  const handleBulkStatus = async (isActive) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`${isActive ? 'Reactivate' : 'Deactivate'} ${ids.length} customer${ids.length === 1 ? '' : 's'}?`)) return;
    setBulkSubmitting(true);
    try {
      const r = await fetch('/api/customers/bulk-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, isActive }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`${d.data.modifiedCount} customer${d.data.modifiedCount === 1 ? '' : 's'} ${isActive ? 'reactivated' : 'deactivated'}`); load(search, statusFilter); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`PERMANENTLY delete ${ids.length} customer${ids.length === 1 ? '' : 's'}? This cannot be undone. Their past sales/payments will remain in reports but will no longer link to a customer profile.`)) return;
    setBulkSubmitting(true);
    try {
      const r = await fetch('/api/customers/bulk-purge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`${d.data.deletedCount} customer${d.data.deletedCount === 1 ? '' : 's'} deleted`); load(search, statusFilter); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name: form.name, phone: form.phone, address: form.address, businessName: form.businessName,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
        openingBalance: Number(form.openingBalance) || 0,
      };
      const r = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success('Created'); setShowModal(false); load(search, statusFilter); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer profiles and balances"
        action={<button onClick={openCreate} className={btnPrimaryCls}>Add Customer</button>}
      />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, business name, or ID..."
          className={inputCls + ' max-w-md'}
        />
        <div className="flex gap-2">
          {['all', 'active', 'archived'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-sm rounded border ${statusFilter === s ? 'bg-green-800 text-neutral-100 border-green-800' : 'bg-white hover:bg-gray-50'}`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-gray-50 border rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button onClick={() => handleBulkStatus(true)} disabled={bulkSubmitting} className={btnPrimaryCls}>Activate</button>
          <button onClick={() => handleBulkStatus(false)} disabled={bulkSubmitting} className={btnDangerCls}>Deactivate</button>
          {statusFilter === 'archived' && (
            <button onClick={handleBulkDelete} disabled={bulkSubmitting} className={btnDangerCls}>Delete Permanently</button>
          )}
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:underline ml-auto">Clear selection</button>
        </div>
      )}

      {loading ? <Loader /> : (
        <Card className="overflow-hidden">
          <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-3 text-left font-medium w-10">
                  <input type="checkbox" checked={customers.length > 0 && selectedIds.size === customers.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 && <EmptyRow colSpan={3} text="No customers found" />}
              {customers.map(c => (
                <tr key={c._id} className={selectedIds.has(c._id) ? 'bg-green-50' : ''}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(c._id)} onChange={() => toggleSelected(c._id)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c._id}`} className="font-medium hover:underline">
                      {formatCustomerLabel(c)}
                      {!c.isActive && <span className="ml-2 text-xs text-gray-400 font-normal">(archived)</span>}
                    </Link>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${c.balance < 0 ? 'text-red-600' : c.balance > 0 ? 'text-green-600' : ''}`}>
                    {formatNaira(c.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Customer">
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
          <Field label="Opening balance (₦)">
            <CurrencyInput value={form.openingBalance} onChange={val => setForm({ ...form, openingBalance: val })} className={inputCls} allowNegative />
            <p className="text-xs text-gray-500 mt-1">Positive = credit (we owe them). Negative = debt (they owe us).</p>
          </Field>
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
