'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput, btnPrimaryCls, theadCls, tableScrollCls } from '@/components/ui';
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

  const load = async (q = '', status = statusFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ status });
    if (q) params.set('search', q);
    const r = await fetch(`/api/customers?${params.toString()}`);
    const d = await r.json();
    if (d.success) setCustomers(d.data);
    setLoading(false);
  };

  useEffect(() => { load(search, statusFilter); }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setForm(blankForm); setShowModal(true); };

  const totalDebt = -customers.filter(c => c.balance < 0).reduce((s, c) => s + c.balance, 0);
  const totalSurplus = customers.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const net = totalSurplus - totalDebt;

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-gray-600">Total Debt</p>
          <p className="text-2xl font-bold text-red-600">{formatNaira(totalDebt)}</p>
        </div>
        <div className="rounded-lg p-4 bg-green-50 border border-green-200">
          <p className="text-sm text-gray-600">Total Surplus</p>
          <p className="text-2xl font-bold text-green-700">{formatNaira(totalSurplus)}</p>
        </div>
        <div className={`rounded-lg p-4 ${net < 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="text-sm text-gray-600">Net (Surplus − Debt)</p>
          <p className={`text-2xl font-bold ${net < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatNaira(net)}</p>
        </div>
      </div>

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

      {loading ? <Loader /> : (
        <Card className="overflow-hidden">
          <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 && <EmptyRow colSpan={2} text="No customers found" />}
              {customers.map(c => (
                <tr key={c._id}>
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
