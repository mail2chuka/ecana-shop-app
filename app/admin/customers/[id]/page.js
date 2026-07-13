'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatNaira, formatDate, formatCustomerLabel } from '@/lib/format';
import { Modal, Field, FormButtons, inputCls, CurrencyInput, btnPrimaryCls, tableActionCls, theadCls, tableScrollCls } from '@/components/ui';
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

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(blankPaymentForm);
  const [submitting, setSubmitting] = useState(false);

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
          <h1 className="text-xl font-bold">{formatCustomerLabel(customer)}</h1>
          {customer.businessName && <p className="text-sm text-gray-500">{customer.businessName}</p>}
          <p className="text-sm text-gray-500">{customer.phone}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openPaymentModal} className={btnPrimaryCls}>Record Payment</button>
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
    </div>
  );
}
