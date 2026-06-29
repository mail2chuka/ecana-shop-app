'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls } from '@/components/ui';
import { formatNaira, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = {
  customer: '', amount: '', method: 'cash', reference: '', notes: '',
  date: new Date().toISOString().split('T')[0],
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const load = async () => {
    const [p, c] = await Promise.all([
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]);
    if (p.success) setPayments(p.data);
    if (c.success) setCustomers(c.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch) ||
        (c.businessName || '').toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer) return toast.error('Pick a customer');
    if (!form.amount || form.amount <= 0) return toast.error('Enter amount');
    setSubmitting(true);
    const r = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const d = await r.json();
    setSubmitting(false);
    if (d.success) {
      toast.success('Payment recorded');
      setShowModal(false);
      setForm(blankForm);
      setCustomerSearch('');
      load();
    } else toast.error(d.error);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Customer Payments"
        subtitle="Top-ups added to customer balances"
        action={<button onClick={() => setShowModal(true)} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Record Payment</button>}
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Method</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Reference</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">New Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 && <EmptyRow colSpan={6} text="No payments yet" />}
            {payments.map(p => (
              <tr key={p._id}>
                <td className="px-4 py-3">{formatDate(p.date)}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/customers/${p.customer}`} className="hover:underline">{p.customerName}</Link>
                </td>
                <td className="px-4 py-3 capitalize">{p.method}</td>
                <td className="px-4 py-3 text-gray-500">{p.reference || '-'}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">{formatNaira(p.amount)}</td>
                <td className="px-4 py-3 text-right">{formatNaira(p.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setCustomerSearch(''); }} title="Record Customer Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Customer" required>
            <input
              type="text"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search by name, phone, business..."
              className={inputCls + ' mb-2'}
            />
            <select value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} className={inputCls} required size="5">
              <option value="">— Select customer —</option>
              {filteredCustomers.slice(0, 50).map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.phone}) — Bal: {formatNaira(c.balance)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₦)" required>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputCls} required min="0.01" />
            </Field>
            <Field label="Method" required>
              <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
                <option value="pos">POS</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
          </div>
          <Field label="Date" required>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Reference">
            <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className={inputCls} placeholder="Transfer ref, cheque #, etc." />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} rows="2" />
          </Field>
          <FormButtons onCancel={() => { setShowModal(false); setCustomerSearch(''); }} submitting={submitting} submitLabel="Record Payment" />
        </form>
      </Modal>
    </div>
  );
}
