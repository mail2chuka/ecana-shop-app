'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatNaira, formatDate, formatCustomerLabel } from '@/lib/format';
import { Modal, Field, FormButtons, inputCls, CurrencyInput, btnPrimaryCls, btnDangerCls, tableActionCls, theadCls, tableScrollCls } from '@/components/ui';
import toast from 'react-hot-toast';

const blankPaymentForm = {
  amount: '',
  method: 'transfer',
  depositorName: '',
  bankName: '',
  reference: '',
  notes: '',
  date: new Date().toISOString().split('T')[0],
};

const blankEditForm = { name: '', phone: '', address: '', businessName: '', creditLimit: '' };

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(blankPaymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(blankEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const load = () => {
    fetch(`/api/customers/${id}/statement`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else toast.error(d.error); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openPaymentModal = () => {
    setPaymentForm(blankPaymentForm);
    setShowPaymentModal(true);
  };

  const openEditModal = () => {
    setEditForm({
      name: data.customer.name, phone: data.customer.phone, address: data.customer.address || '',
      businessName: data.customer.businessName || '', creditLimit: data.customer.creditLimit || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const body = {
        name: editForm.name, phone: editForm.phone, address: editForm.address, businessName: editForm.businessName,
        creditLimit: editForm.creditLimit ? Number(editForm.creditLimit) : null,
      };
      const r = await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success('Updated'); setShowEditModal(false); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async () => {
    const isActive = data.customer.isActive;
    if (!confirm(isActive ? `Archive ${data.customer.name}? They'll be hidden from active lists and can't be sold to until reactivated.` : `Reactivate ${data.customer.name}?`)) return;
    setTogglingActive(true);
    try {
      const r = await fetch(`/api/customers/${id}`, {
        method: isActive ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: isActive ? undefined : JSON.stringify({ isActive: true }),
      });
      const d = await r.json();
      if (d.success) { toast.success(isActive ? 'Archived' : 'Reactivated'); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setTogglingActive(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || paymentForm.amount <= 0) return toast.error('Enter amount');
    if (!paymentForm.depositorName) return toast.error('Enter depositor name');
    if (!paymentForm.bankName) return toast.error('Enter bank name');

    setSubmitting(true);
    try {
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentForm, customer: id, amount: Number(paymentForm.amount) }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('Payment recorded');
        setShowPaymentModal(false);
        load();
      } else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-gray-500">Customer not found</p>;

  const { customer, ledger } = data;

  return (
    <div>
      <div className="mb-6 flex justify-between items-start no-print">
        <div>
          <h1 className="text-xl font-bold">
            {customer.name}
            {!customer.isActive && <span className="ml-2 align-middle text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Archived</span>}
          </h1>
          {customer.customerId && <p className="text-sm text-gray-500">{customer.customerId}</p>}
        </div>
        <div className="flex gap-2">
          {customer.isActive && <button onClick={openPaymentModal} className={btnPrimaryCls}>Record Payment</button>}
          <button onClick={openEditModal} className={btnPrimaryCls}>Edit</button>
          <button onClick={handleToggleActive} disabled={togglingActive} className={customer.isActive ? btnDangerCls : btnPrimaryCls}>
            {customer.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Print Statement</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className={`rounded-lg p-4 ${customer.balance < 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className={`text-3xl font-bold ${customer.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatNaira(customer.balance)}</p>
          {customer.balance < 0 && <p className="text-sm text-red-600 mt-1">Customer owes this amount</p>}
        </div>
        <div className="rounded-lg p-4 bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-600">Credit Limit</p>
          <p className="text-3xl font-bold text-gray-800">{customer.creditLimit ? formatNaira(customer.creditLimit) : 'None'}</p>
          <p className="text-xs text-gray-500 mt-1">Maximum amount this customer can owe</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-sm mb-3">Customer Details</h3>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p><span className="text-gray-500">Customer ID:</span> <span className="font-medium">{customer.customerId || '-'}</span></p>
          <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{customer.phone}</span></p>
          <p><span className="text-gray-500">Business Name:</span> <span className="font-medium">{customer.businessName || '-'}</span></p>
          <p><span className="text-gray-500">Address:</span> <span className="font-medium">{customer.address || '-'}</span></p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between">
          <h3 className="font-semibold text-sm">Account Statement</h3>
          <span className="text-xs text-gray-500">{ledger.length} entries</span>
        </div>
        <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Ref</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
                <th className="px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledger.map((entry, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-2">
                    {entry.type === 'sale'
                      ? <Link href={`/admin/sales/${entry.id}`} className={`${tableActionCls} hover:underline`}>{entry.ref}</Link>
                      : <button onClick={() => setSelectedPayment(entry)} className={`${tableActionCls} hover:underline text-left`}>{entry.ref}</button>}
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-2 text-right text-red-600">{entry.debit > 0 ? formatNaira(entry.debit) : '-'}</td>
                  <td className="px-4 py-2 text-right text-green-600">{entry.credit > 0 ? formatNaira(entry.credit) : '-'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${(entry.balance ?? 0) < 0 ? 'text-red-600' : ''}`}>
                    {entry.balance !== undefined ? formatNaira(entry.balance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ledger.length === 0 && <p className="text-center text-gray-500 py-8">No transactions yet</p>}
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && selectedPayment.type === 'payment' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Payment Details</h2>
            <div className="space-y-3 text-sm mb-6">
              <div>
                <p className="text-gray-500">Transaction ID</p>
                <p className="font-mono font-bold">{selectedPayment.transactionNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">Date</p>
                <p>{formatDate(selectedPayment.date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Amount</p>
                <p className="text-green-600 font-medium">{formatNaira(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Method</p>
                <p className="capitalize">{selectedPayment.method}</p>
              </div>
              <div>
                <p className="text-gray-500">Depositor Name</p>
                <p>{selectedPayment.depositorName}</p>
              </div>
              <div>
                <p className="text-gray-500">Bank Name</p>
                <p>{selectedPayment.bankName}</p>
              </div>
              {selectedPayment.reference && (
                <div>
                  <p className="text-gray-500">Reference</p>
                  <p>{selectedPayment.reference}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedPayment(null)}
              className="w-full px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`Record Payment — ${formatCustomerLabel(customer)}`}>
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Method" required>
              <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} className={inputCls}>
                <option value="transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="pos">POS</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
            <Field label="Date" required>
              <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} className={inputCls} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Depositor Name" required>
              <input
                type="text"
                value={paymentForm.depositorName}
                onChange={e => setPaymentForm({ ...paymentForm, depositorName: e.target.value })}
                placeholder="Name of person who made the deposit"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Bank Name" required>
              <input
                type="text"
                value={paymentForm.bankName}
                onChange={e => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                placeholder="e.g., GTBank, Zenith, Access..."
                className={inputCls}
                required
              />
            </Field>
          </div>
          <Field label="Amount (₦)" required>
            <CurrencyInput
              value={paymentForm.amount}
              onChange={val => setPaymentForm({ ...paymentForm, amount: val })}
              placeholder="0.00"
              className={inputCls}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference">
              <input
                type="text"
                value={paymentForm.reference}
                onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                placeholder="Transfer ref, cheque #..."
                className={inputCls}
              />
            </Field>
            <Field label="Remark">
              <input
                type="text"
                value={paymentForm.notes}
                onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional notes..."
                className={inputCls}
              />
            </Field>
          </div>
          <FormButtons onCancel={() => setShowPaymentModal(false)} submitting={submitting} submitLabel="Record Payment" />
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Customer">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Field label="Name" required>
            <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Phone" required>
            <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Business name">
            <input type="text" value={editForm.businessName} onChange={e => setEditForm({ ...editForm, businessName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Address">
            <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Credit limit (₦)">
            <CurrencyInput value={editForm.creditLimit} onChange={val => setEditForm({ ...editForm, creditLimit: val })} className={inputCls} placeholder="Leave blank for no limit" />
            <p className="text-xs text-gray-500 mt-1">Maximum amount this customer can owe.</p>
          </Field>
          <FormButtons onCancel={() => setShowEditModal(false)} submitting={savingEdit} />
        </form>
      </Modal>
    </div>
  );
}
