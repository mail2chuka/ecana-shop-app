'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatNaira, formatDate, formatDateTime, formatCustomerLabel } from '@/lib/format';
import { Modal, Field, FormButtons, inputCls, CurrencyInput, btnPrimaryCls, btnDangerCls, tableActionCls, theadCls, tableScrollCls } from '@/components/ui';
import { shareReceiptAsPdf, shareReceiptAsJpg } from '@/lib/receiptCapture';
import { apiFetch } from '@/lib/apiClient';
import toast from 'react-hot-toast';

const blankPaymentForm = {
  amount: '',
  method: 'transfer',
  depositorName: '',
  bankName: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
};

const blankEditForm = { name: '', phone: '', address: '', businessName: '', creditLimit: '' };
const blankSurchargeForm = { method: 'flat_total', perUnitAmount: '', totalAmount: '', reason: '', confirmPin: '' };
const blankRefundForm = { amount: '', reason: '', confirmPin: '' };

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(blankPaymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(blankEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgePin, setPurgePin] = useState('');

  const [showSurcharge, setShowSurcharge] = useState(false);
  const [surchargeSaleId, setSurchargeSaleId] = useState(null);
  const [surchargeStandalone, setSurchargeStandalone] = useState(false);
  const [surchargeSearch, setSurchargeSearch] = useState('');
  const [surchargeForm, setSurchargeForm] = useState(blankSurchargeForm);
  const [submittingSurcharge, setSubmittingSurcharge] = useState(false);

  const [showRefund, setShowRefund] = useState(false);
  const [refundSaleId, setRefundSaleId] = useState(null);
  const [refundStandalone, setRefundStandalone] = useState(false);
  const [refundSearch, setRefundSearch] = useState('');
  const [refundForm, setRefundForm] = useState(blankRefundForm);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementOrientation, setStatementOrientation] = useState('portrait');

  const load = (silent = false, overrides = {}) => {
    if (!silent) setLoading(true);
    const sd = overrides.startDate !== undefined ? overrides.startDate : statementStartDate;
    const ed = overrides.endDate !== undefined ? overrides.endDate : statementEndDate;
    const params = new URLSearchParams();
    if (sd) params.set('startDate', sd);
    if (ed) params.set('endDate', ed);
    setStatementLoading(true);
    apiFetch(`/api/customers/${id}/statement?${params.toString()}`)
      .then(d => { if (d.success) setData(d.data); else toast.error(d.error); })
      .finally(() => { setLoading(false); setStatementLoading(false); });
  };

  const clearStatementDateFilter = () => {
    setStatementStartDate('');
    setStatementEndDate('');
    load(true, { startDate: '', endDate: '' });
  };

  const [sharing, setSharing] = useState(null); // null | 'pdf' | 'jpg'

  const shareStatement = async (format) => {
    setSharing(format);
    // The ledger table scrolls on screen (tableScrollCls) — neutralize that for the capture so a
    // long statement isn't cut off at the same 70vh cap that's fine for on-screen browsing.
    const scrollEl = document.getElementById('statement-table-scroll');
    const prevOverflow = scrollEl?.style.overflow;
    const prevMaxHeight = scrollEl?.style.maxHeight;
    if (scrollEl) { scrollEl.style.overflow = 'visible'; scrollEl.style.maxHeight = 'none'; }
    // The customer-name header is print:block (hidden on screen) — html2canvas captures the DOM as
    // currently shown on screen, not simulated print media, so it never sees this unless we force it.
    const headerEl = document.getElementById('statement-print-header');
    const prevHeaderDisplay = headerEl?.style.display;
    if (headerEl) headerEl.style.display = 'block';
    try {
      const rangeSuffix = statementStartDate || statementEndDate
        ? `-${statementStartDate || 'start'}_to_${statementEndDate || 'now'}`
        : '';
      const base = `Statement-${customer.name.replace(/\s+/g, '_')}${rangeSuffix}`;
      const title = `Account Statement — ${formatCustomerLabel(customer)}`;
      if (format === 'pdf') {
        await shareReceiptAsPdf('statement-content', `${base}.pdf`, title, { orientation: statementOrientation });
      } else {
        await shareReceiptAsJpg('statement-content', `${base}.jpg`, title, { orientation: statementOrientation });
      }
    } catch (err) {
      toast.error(err.message || 'Could not generate file');
    } finally {
      if (scrollEl) { scrollEl.style.overflow = prevOverflow || ''; scrollEl.style.maxHeight = prevMaxHeight || ''; }
      if (headerEl) headerEl.style.display = prevHeaderDisplay || '';
      setSharing(null);
    }
  };

  useEffect(() => { load(); }, [id]);

  const openPaymentModal = () => {
    setPaymentForm(blankPaymentForm);
    setShowPaymentModal(true);
  };

  const openEditModal = () => {
    setEditForm({
      name: data.customer.name, phone: data.customer.phone, address: data.customer.address || '',
      businessName: data.customer.businessName || '', creditLimit: data.customer.creditLimit ?? '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const body = {
        name: editForm.name, phone: editForm.phone, address: editForm.address, businessName: editForm.businessName,
        creditLimit: editForm.creditLimit === '' ? null : Number(editForm.creditLimit),
      };
      const d = await apiFetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
      const d = await apiFetch(`/api/customers/${id}`, {
        method: isActive ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: isActive ? undefined : JSON.stringify({ isActive: true }),
      });
      if (d.success) { toast.success(isActive ? 'Archived' : 'Reactivated'); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setTogglingActive(false);
    }
  };

  const openPurgeModal = () => { setPurgePin(''); setShowPurgeModal(true); };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      const d = await apiFetch('/api/customers/bulk-purge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], confirmPin: purgePin }),
      });
      if (d.success) { toast.success('Customer deleted'); router.push('/admin/customers'); }
      else { toast.error(d.error); setDeleting(false); }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
      setDeleting(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || paymentForm.amount <= 0) return toast.error('Enter amount');
    if (!paymentForm.depositorName) return toast.error('Enter depositor name');
    if (!paymentForm.bankName) return toast.error('Enter bank name');

    setSubmitting(true);
    try {
      const d = await apiFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentForm, customer: id, amount: Number(paymentForm.amount) }),
      });
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

  const openSurcharge = () => {
    setSurchargeSaleId(null);
    setSurchargeStandalone(false);
    setSurchargeSearch('');
    setSurchargeForm(blankSurchargeForm);
    setShowSurcharge(true);
  };
  const openRefund = () => {
    setRefundSaleId(null);
    setRefundStandalone(false);
    setRefundSearch('');
    setRefundForm(blankRefundForm);
    setShowRefund(true);
  };

  const handleSurchargeSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSurcharge(true);
    try {
      const url = surchargeStandalone ? `/api/customers/${id}/surcharge` : `/api/sales/${surchargeSaleId}/surcharge`;
      const body = surchargeStandalone
        ? { amount: surchargeForm.totalAmount, reason: surchargeForm.reason, confirmPin: surchargeForm.confirmPin }
        : surchargeForm;
      const d = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (d.success) {
        toast.success('Surcharge applied');
        setShowSurcharge(false);
        load();
      } else {
        toast.error(d.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmittingSurcharge(false);
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    setSubmittingRefund(true);
    try {
      const url = refundStandalone ? `/api/customers/${id}/refund` : `/api/sales/${refundSaleId}/refund`;
      const d = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refundForm),
      });
      if (d.success) {
        toast.success('Fund applied');
        setShowRefund(false);
        load();
      } else {
        toast.error(d.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-gray-500">Customer not found</p>;

  const { customer, ledger } = data;
  const adjustableSales = ledger.filter(e => e.type === 'sale' && e.saleType !== 'shop');

  return (
    <div>
      <div className="mb-6 flex justify-between items-start no-print">
        <div>
          <h1 className="text-xl font-bold">
            {formatCustomerLabel(customer)}
            {!customer.isActive && <span className="ml-2 align-middle text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Archived</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          {customer.isActive && <button onClick={openPaymentModal} className={btnPrimaryCls}>Record Payment</button>}
          <button onClick={openEditModal} className={btnPrimaryCls}>Edit</button>
          <button onClick={handleToggleActive} disabled={togglingActive} className={customer.isActive ? btnDangerCls : btnPrimaryCls}>
            {customer.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
          {!customer.isActive && (
            <button onClick={openPurgeModal} disabled={deleting} className={btnDangerCls}>Delete Permanently</button>
          )}
          {isAdmin && (
            <>
              <button onClick={openSurcharge} className="px-4 py-2 bg-amber-700 text-neutral-100 rounded text-sm hover:bg-amber-800">Apply Surcharge</button>
              <button onClick={openRefund} className="px-4 py-2 bg-amber-700 text-neutral-100 rounded text-sm hover:bg-amber-800">Fund</button>
            </>
          )}
          <select
            value={statementOrientation}
            onChange={e => setStatementOrientation(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
            title="Page orientation for Print / Share"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
          <button onClick={() => window.print()} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Print Statement</button>
          <button onClick={() => shareStatement('pdf')} disabled={!!sharing} className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50">
            {sharing === 'pdf' ? 'Preparing...' : 'Share PDF'}
          </button>
          <button onClick={() => shareStatement('jpg')} disabled={!!sharing} className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50">
            {sharing === 'jpg' ? 'Preparing...' : 'Share JPG'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 ${statementOrientation}; }
        }
      `}</style>

      <div className="bg-white border rounded-lg p-4 mb-6 no-print">
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={statementStartDate} onChange={e => setStatementStartDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={statementEndDate} onChange={e => setStatementEndDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => load(true)} disabled={statementLoading} className={`flex-1 ${btnPrimaryCls}`}>
              {statementLoading ? 'Loading...' : 'Filter'}
            </button>
            {(statementStartDate || statementEndDate) && (
              <button onClick={clearStatementDateFilter} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Clear</button>
            )}
          </div>
        </div>
      </div>

      <div id="statement-content">
        <div id="statement-print-header" className="mb-4 hidden print:block">
          <h2 className="text-lg font-bold">
            {formatCustomerLabel(customer)}
            {!customer.isActive && <span className="ml-2 text-xs font-medium text-amber-700">(Archived)</span>}
          </h2>
          <p className="text-xs text-gray-500">
            Account Statement{(statementStartDate || statementEndDate) && ` — ${statementStartDate ? formatDate(statementStartDate) : 'start'} to ${statementEndDate ? formatDate(statementEndDate) : 'now'}`}
            {' · '}Generated {formatDateTime(new Date())}
          </p>
        </div>

        <div className="mb-6">
          <div className={`rounded-lg p-4 max-w-md ${customer.balance < 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="text-sm text-gray-600">Current Balance</p>
            <p className={`text-3xl font-bold ${customer.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatNaira(customer.balance)}</p>
            {customer.balance < 0 && <p className="text-sm text-red-600 mt-1">Customer owes this amount</p>}
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
          <div id="statement-table-scroll" className={tableScrollCls}>
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead className={theadCls}>
              <tr>
                <th className="px-1.5 py-1 text-left">Date</th>
                <th className="px-1.5 py-1 text-left">Ref</th>
                <th className="px-1.5 py-1 text-left">Description</th>
                <th className="px-1.5 py-1 text-right">Qty</th>
                <th className="px-1.5 py-1 text-right">Unit Price</th>
                <th className="px-1.5 py-1 text-right">Transport</th>
                <th className="px-1.5 py-1 text-right">Debit</th>
                <th className="px-1.5 py-1 text-right">Credit</th>
                <th className="px-1.5 py-1 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledger.map((entry, i) => {
                const refLink = entry.type === 'sale'
                  ? <Link href={`/admin/sales/${entry.id}`} className={`${tableActionCls} hover:underline`}>{entry.ref}</Link>
                  : (entry.type === 'surcharge' || entry.type === 'refund')
                  ? <Link href={entry.standalone ? `/admin/adjustments/${entry.id}` : `/admin/sales/${entry.id}/adjustments/${entry.adjId}`} className={`${tableActionCls} hover:underline`}>{entry.ref}</Link>
                  : <Link href={`/admin/payments/${entry.id}`} className={`${tableActionCls} hover:underline`}>{entry.ref}</Link>;

                // A multi-product sale (e.g. two cement brands in one transaction) gets one mini-row
                // per item instead of a single row summing/averaging different products together —
                // each mini-row carries its own real qty and unit price. Date/Ref/Transport/Debit/
                // Credit/Balance describe the transaction as a whole, so they span every mini-row
                // instead of repeating (or being blank) on each one.
                const items = entry.type === 'sale' && entry.items && entry.items.length > 1 ? entry.items : null;

                if (items) {
                  return items.map((li, j) => (
                    <tr key={`${i}-${j}`}>
                      {j === 0 && <td className="px-1.5 py-1 align-top" rowSpan={items.length}>{formatDate(entry.date)}</td>}
                      {j === 0 && <td className="px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis align-top" rowSpan={items.length}>{refLink}</td>}
                      <td className="px-1.5 py-1 text-gray-600 break-words">{li.qty} {li.unit} {li.name}</td>
                      <td className="px-1.5 py-1 text-right">{li.qty}</td>
                      <td className="px-1.5 py-1 text-right break-words">{formatNaira(li.unitPrice)}</td>
                      {j === 0 && <td className="px-1.5 py-1 text-right break-words align-top" rowSpan={items.length}>{entry.transport ? formatNaira(entry.transport) : '-'}</td>}
                      {j === 0 && <td className="px-1.5 py-1 text-right text-red-600 break-words align-top" rowSpan={items.length}>{entry.debit > 0 ? formatNaira(entry.debit) : '-'}</td>}
                      {j === 0 && <td className="px-1.5 py-1 text-right text-green-600 break-words align-top" rowSpan={items.length}>{entry.credit > 0 ? formatNaira(entry.credit) : '-'}</td>}
                      {j === 0 && (
                        <td className={`px-1.5 py-1 text-right font-medium break-words align-top ${(entry.balance ?? 0) < 0 ? 'text-red-600' : ''}`} rowSpan={items.length}>
                          {entry.balance !== undefined ? formatNaira(entry.balance) : '-'}
                        </td>
                      )}
                    </tr>
                  ));
                }

                return (
                  <tr key={i}>
                    <td className="px-1.5 py-1">{formatDate(entry.date)}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis">{refLink}</td>
                    <td className="px-1.5 py-1 text-gray-600 break-words">{entry.description}</td>
                    <td className="px-1.5 py-1 text-right">{entry.qty ?? '-'}</td>
                    <td className="px-1.5 py-1 text-right break-words">{entry.unitPrice ? formatNaira(entry.unitPrice) : '-'}</td>
                    <td className="px-1.5 py-1 text-right break-words">{entry.transport ? formatNaira(entry.transport) : '-'}</td>
                    <td className="px-1.5 py-1 text-right text-red-600 break-words">{entry.debit > 0 ? formatNaira(entry.debit) : '-'}</td>
                    <td className="px-1.5 py-1 text-right text-green-600 break-words">{entry.credit > 0 ? formatNaira(entry.credit) : '-'}</td>
                    <td className={`px-1.5 py-1 text-right font-medium break-words ${(entry.balance ?? 0) < 0 ? 'text-red-600' : ''}`}>
                      {entry.balance !== undefined ? formatNaira(entry.balance) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ledger.length === 0 && <p className="text-center text-gray-500 py-8">No transactions yet</p>}
          </div>
        </div>
      </div>

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
          <Field label="Remark">
            <input
              type="text"
              value={paymentForm.description}
              onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
              placeholder="Additional notes..."
              className={inputCls}
            />
          </Field>
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

      {/* Delete Permanently Modal */}
      <Modal open={showPurgeModal} onClose={() => setShowPurgeModal(false)} title="Delete Customer Permanently">
        <form onSubmit={handleDelete} className="space-y-4">
          <p className="text-sm text-gray-500">
            PERMANENTLY delete {data.customer.name}? This cannot be undone. Their past sales/payments will remain in reports but will no longer link to a customer profile.
          </p>
          <Field label="4-digit PIN" required>
            <input
              type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
              value={purgePin}
              onChange={e => setPurgePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={inputCls} required autoFocus
            />
          </Field>
          <FormButtons onCancel={() => setShowPurgeModal(false)} submitting={deleting} submitLabel="Delete Permanently" />
        </form>
      </Modal>

      {/* Apply Surcharge Modal — search/pick a transaction, enter surcharge details, or go standalone */}
      <Modal open={showSurcharge} onClose={() => setShowSurcharge(false)} title="Apply Surcharge" size="lg">
        {surchargeStandalone ? (
          <form onSubmit={handleSurchargeSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded p-3 text-sm flex justify-between items-center">
              <span>Not tied to a transaction</span>
              <button type="button" onClick={() => setSurchargeStandalone(false)} className="text-xs text-gray-500 hover:underline">Pick a transaction instead</button>
            </div>
            <Field label="Total amount (₦)" required>
              <CurrencyInput value={surchargeForm.totalAmount} onChange={val => setSurchargeForm({ ...surchargeForm, totalAmount: val })} className={inputCls} required />
            </Field>
            <Field label="Reason" required>
              <textarea value={surchargeForm.reason} onChange={e => setSurchargeForm({ ...surchargeForm, reason: e.target.value })} rows={2} className={inputCls} required />
            </Field>
            <Field label="4-digit PIN" required>
              <input
                type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                value={surchargeForm.confirmPin}
                onChange={e => setSurchargeForm({ ...surchargeForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className={inputCls} required
              />
            </Field>
            <FormButtons onCancel={() => setShowSurcharge(false)} submitting={submittingSurcharge} submitLabel="Apply Surcharge" />
          </form>
        ) : !surchargeSaleId ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Search by transaction ID</label>
              <input
                type="text"
                value={surchargeSearch}
                onChange={e => setSurchargeSearch(e.target.value)}
                placeholder="Enter a transaction ref..."
                className={inputCls}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y border rounded">
              {adjustableSales
                .filter(s => !surchargeSearch.trim() || s.ref.toLowerCase().includes(surchargeSearch.trim().toLowerCase()))
                .map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSurchargeSaleId(s.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    <p className="font-medium">{s.ref} — {formatDate(s.date)}</p>
                    <p className="text-xs text-gray-500 truncate">{s.description} · {formatNaira(s.debit)}</p>
                  </button>
                ))}
              {adjustableSales.length === 0 && <p className="text-sm text-gray-500 px-3 py-2">No cement/aggregate sales to surcharge.</p>}
              {adjustableSales.length > 0 && adjustableSales.filter(s => !surchargeSearch.trim() || s.ref.toLowerCase().includes(surchargeSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-500 px-3 py-2">No transaction matches that ID.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSurchargeStandalone(true)}
              className="w-full px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Surcharge not tied to a transaction
            </button>
          </div>
        ) : (
          <form onSubmit={handleSurchargeSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded p-3 text-sm flex justify-between items-center">
              <span>{adjustableSales.find(s => s.id === surchargeSaleId)?.ref}</span>
              <button type="button" onClick={() => setSurchargeSaleId(null)} className="text-xs text-gray-500 hover:underline">Change transaction</button>
            </div>
            <Field label="Method" required>
              <select value={surchargeForm.method} onChange={e => setSurchargeForm({ ...surchargeForm, method: e.target.value })} className={inputCls} required>
                <option value="flat_total">Flat total</option>
                <option value="per_unit">Per unit (× quantity sold)</option>
                <option value="transport">Transport surcharge</option>
              </select>
            </Field>
            {surchargeForm.method === 'per_unit' ? (
              <Field label="Amount per unit (₦)" required>
                <CurrencyInput value={surchargeForm.perUnitAmount} onChange={val => setSurchargeForm({ ...surchargeForm, perUnitAmount: val })} className={inputCls} required />
              </Field>
            ) : (
              <Field label="Total amount (₦)" required>
                <CurrencyInput value={surchargeForm.totalAmount} onChange={val => setSurchargeForm({ ...surchargeForm, totalAmount: val })} className={inputCls} required />
              </Field>
            )}
            <Field label="Reason" required>
              <textarea value={surchargeForm.reason} onChange={e => setSurchargeForm({ ...surchargeForm, reason: e.target.value })} rows={2} className={inputCls} required />
            </Field>
            <Field label="4-digit PIN" required>
              <input
                type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                value={surchargeForm.confirmPin}
                onChange={e => setSurchargeForm({ ...surchargeForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className={inputCls} required
              />
            </Field>
            <FormButtons onCancel={() => setShowSurcharge(false)} submitting={submittingSurcharge} submitLabel="Apply Surcharge" />
          </form>
        )}
      </Modal>

      {/* Fund Modal — search/pick a transaction, enter fund details, or go standalone */}
      <Modal open={showRefund} onClose={() => setShowRefund(false)} title="Fund" size="lg">
        {refundStandalone ? (
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded p-3 text-sm flex justify-between items-center">
              <span>Not tied to a transaction</span>
              <button type="button" onClick={() => setRefundStandalone(false)} className="text-xs text-gray-500 hover:underline">Pick a transaction instead</button>
            </div>
            <Field label="Fund amount (₦)" required>
              <CurrencyInput value={refundForm.amount} onChange={val => setRefundForm({ ...refundForm, amount: val })} className={inputCls} required />
            </Field>
            <Field label="Reason" required>
              <textarea value={refundForm.reason} onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })} rows={2} className={inputCls} required />
            </Field>
            <Field label="4-digit PIN" required>
              <input
                type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                value={refundForm.confirmPin}
                onChange={e => setRefundForm({ ...refundForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className={inputCls} required
              />
            </Field>
            <FormButtons onCancel={() => setShowRefund(false)} submitting={submittingRefund} submitLabel="Apply Fund" />
          </form>
        ) : !refundSaleId ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Search by transaction ID</label>
              <input
                type="text"
                value={refundSearch}
                onChange={e => setRefundSearch(e.target.value)}
                placeholder="Enter a transaction ref..."
                className={inputCls}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y border rounded">
              {adjustableSales
                .filter(s => !refundSearch.trim() || s.ref.toLowerCase().includes(refundSearch.trim().toLowerCase()))
                .map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRefundSaleId(s.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    <p className="font-medium">{s.ref} — {formatDate(s.date)}</p>
                    <p className="text-xs text-gray-500 truncate">{s.description} · {formatNaira(s.debit)}</p>
                  </button>
                ))}
              {adjustableSales.length === 0 && <p className="text-sm text-gray-500 px-3 py-2">No cement/aggregate sales to fund.</p>}
              {adjustableSales.length > 0 && adjustableSales.filter(s => !refundSearch.trim() || s.ref.toLowerCase().includes(refundSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-500 px-3 py-2">No transaction matches that ID.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRefundStandalone(true)}
              className="w-full px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Fund not tied to a transaction
            </button>
          </div>
        ) : (
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded p-3 text-sm flex justify-between items-center">
              <span>{adjustableSales.find(s => s.id === refundSaleId)?.ref}</span>
              <button type="button" onClick={() => setRefundSaleId(null)} className="text-xs text-gray-500 hover:underline">Change transaction</button>
            </div>
            <p className="text-sm text-gray-500">
              For a billed-vs-actual quantity shortfall, open the transaction to check its Qty, then enter the fund amount below (this credits the customer's balance).
            </p>
            <Field label="Fund amount (₦)" required>
              <CurrencyInput value={refundForm.amount} onChange={val => setRefundForm({ ...refundForm, amount: val })} className={inputCls} required />
            </Field>
            <Field label="Reason" required>
              <textarea value={refundForm.reason} onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })} rows={2} className={inputCls} required />
            </Field>
            <Field label="4-digit PIN" required>
              <input
                type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                value={refundForm.confirmPin}
                onChange={e => setRefundForm({ ...refundForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className={inputCls} required
              />
            </Field>
            <FormButtons onCancel={() => setShowRefund(false)} submitting={submittingRefund} submitLabel="Apply Fund" />
          </form>
        )}
      </Modal>
    </div>
  );
}
