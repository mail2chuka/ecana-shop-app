'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput, btnPrimaryCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatNaira, formatDate, formatCustomerLabel } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = {
  customer: '',
  amount: '',
  method: 'transfer',
  depositorName: '',
  bankName: '',
  reference: '',
  notes: '',
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
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const searchRef = useRef(null);

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

  // Search customers as user types
  useEffect(() => {
    if (customerSearch.length < 1) {
      setFilteredCustomers([]);
      setShowDropdown(false);
      return;
    }

    const query = customerSearch.toLowerCase();
    const filtered = customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.businessName || '').toLowerCase().includes(query) ||
      (c.customerId || '').includes(query)
    ).slice(0, 15); // Limit to 15 results for performance

    setFilteredCustomers(filtered);
    setShowDropdown(true);
  }, [customerSearch, customers]);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setForm({ ...form, customer: customer._id });
    setCustomerSearch(customer.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer) return toast.error('Select a customer');
    if (!form.amount || form.amount <= 0) return toast.error('Enter amount');
    if (!form.depositorName) return toast.error('Enter depositor name');
    if (!form.bankName) return toast.error('Enter bank name');

    setSubmitting(true);
    try {
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      const d = await r.json();

      if (d.success) {
        toast.success('Payment recorded');
        setShowModal(false);
        setForm(blankForm);
        setCustomerSearch('');
        setSelectedCustomer(null);
        load();
      } else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setForm(blankForm);
    setCustomerSearch('');
    setSelectedCustomer(null);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Customer Payments"
        subtitle="Payments received from customers"
        action={<button onClick={openModal} className={btnPrimaryCls}>New Payment</button>}
      />

      <Card className="overflow-hidden">
        <div className={tableScrollCls}>
        <table className="w-full text-sm">
          <thead className={theadCls}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Ref</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Method</th>
              <th className="px-4 py-3 text-left font-medium">Depositor</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">New Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 && <EmptyRow colSpan={7} text="No payments yet" />}
            {payments.map(p => (
              <tr key={p._id}>
                <td className="px-4 py-3">{formatDate(p.date)}</td>
                <td className="px-4 py-3 font-medium">{p.transactionNumber}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/customers/${p.customer}`} className="hover:underline">{p.customerName}</Link>
                </td>
                <td className="px-4 py-3 capitalize">{p.method === 'transfer' ? 'Bank Transfer' : p.method} {p.bankName ? `(${p.bankName})` : ''}</td>
                <td className="px-4 py-3 text-gray-600">{p.depositorName || '-'}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">{formatNaira(p.amount)}</td>
                <td className="px-4 py-3 text-right">{formatNaira(p.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank & Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Method" required>
              <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className={inputCls}>
                <option value="transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="pos">POS</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
            <Field label="Date" required>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} required />
            </Field>
          </div>

          {/* Depositor Name & Bank */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Depositor Name" required>
              <input
                type="text"
                value={form.depositorName}
                onChange={e => setForm({ ...form, depositorName: e.target.value })}
                placeholder="Name of person who made the deposit"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Bank Name" required>
              <input
                type="text"
                value={form.bankName}
                onChange={e => setForm({ ...form, bankName: e.target.value })}
                placeholder="e.g., GTBank, Zenith, Access..."
                className={inputCls}
                required
              />
            </Field>
          </div>

          {/* Customer Search */}
          <Field label="Customer" required>
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                onFocus={() => filteredCustomers.length > 0 && setShowDropdown(true)}
                placeholder="Search by name, phone, business, or ID..."
                className={inputCls}
                autoComplete="off"
              />

              {showDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-t-0 rounded-b shadow-lg max-h-64 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 border-b transition"
                    >
                      <p className="font-medium text-sm">{formatCustomerLabel(c)}</p>
                      <p className="text-xs text-gray-500">{c.phone} · {c.businessName ? c.businessName : 'Individual'} · Balance: {formatNaira(c.balance)}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <p className="font-medium text-green-900">{formatCustomerLabel(selectedCustomer)}</p>
                  <p className="text-xs text-green-700">{selectedCustomer.phone} · Current Balance: {formatNaira(selectedCustomer.balance)}</p>
                </div>
              )}
            </div>
          </Field>

          {/* Amount */}
          <Field label="Amount (₦)" required>
            <CurrencyInput
              value={form.amount}
              onChange={val => setForm({ ...form, amount: val })}
              placeholder="0.00"
              className={inputCls}
              required
            />
          </Field>

          {/* Reference & Remark */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference">
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="Transfer ref, cheque #..."
                className={inputCls}
              />
            </Field>
            <Field label="Remark">
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
                className={inputCls}
              />
            </Field>
          </div>

          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} submitLabel="Record Payment" />
        </form>
      </Modal>
    </div>
  );
}
