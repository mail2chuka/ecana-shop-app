'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatNaira, formatDate, formatDateTime } from '@/lib/format';
import { Modal, Field, FormButtons, inputCls, CurrencyInput } from '@/components/ui';

export default function SaleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState(null);
  const [brands, setBrands] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState('');
  const [editTransportFee, setEditTransportFee] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTruck, setEditTruck] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);

  const formatAtcNumber = (item) => {
    if (!item.itemType === 'cement' || !item.cementBrand) return item.atcNumber;
    const brand = brands.find(b => b._id === item.cementBrand);
    const abbr = brand?.abbreviation || '???';
    return `${abbr}-${item.atcNumber}`;
  };

  const load = () => {
    Promise.all([
      fetch(`/api/sales/${id}`).then(r => r.json()),
      fetch('/api/cement-brands').then(r => r.json()),
      fetch('/api/trucks').then(r => r.json()),
    ]).then(([d, b, t]) => {
      if (d.success) setSale(d.data);
      if (b.success) setBrands(b.data);
      if (t.success) setTrucks(t.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/sales/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deleteReason }),
    });
    const data = await res.json();
    setDeleting(false);
    if (data.success) {
      toast.success('Sale deleted, balance and stock reversed');
      router.push('/admin/sales');
    } else {
      toast.error(data.error);
    }
  };

  const openEdit = () => {
    setEditItems(sale.items.map(item => ({
      itemType: item.itemType,
      atc: item.atc,
      stoneDustProduct: item.stoneDustProduct,
      shopProduct: item.shopProduct,
      label: item.itemType === 'cement'
        ? `${item.cementBrandName} Cement (ATC ${formatAtcNumber(item)})`
        : item.itemType === 'stonedust'
          ? `${item.quarryName} — ${item.size}`
          : item.shopProductName,
      billQuantity: item.billQuantity,
      actualQuantity: item.actualQuantity,
      unitPrice: item.unitPrice,
    })));
    setEditDiscount(String(sale.discount || 0));
    setEditTransportFee(String(sale.transportFee || 0));
    setEditDate(new Date(sale.date).toISOString().split('T')[0]);
    setEditNotes(sale.notes || '');
    setEditTruck(sale.truck || '');
    setEditPaymentMethod(sale.paymentMethod && sale.paymentMethod !== 'balance' ? sale.paymentMethod : 'cash');
    setShowEdit(true);
  };

  const updateEditItem = (index, field, value) => {
    setEditItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const removeEditItem = (index) => {
    if (editItems.length === 1) { toast.error('A sale must have at least one item'); return; }
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const editSubtotal = editItems.reduce((s, it) => s + (parseFloat(it.billQuantity) || 0) * (parseFloat(it.unitPrice) || 0), 0);
  const editGrandTotal = editSubtotal - (parseFloat(editDiscount) || 0) + (parseFloat(editTransportFee) || 0);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const items = editItems.map(it => ({
        itemType: it.itemType,
        atc: it.atc,
        stoneDustProduct: it.stoneDustProduct,
        shopProduct: it.shopProduct,
        billQuantity: parseFloat(it.billQuantity),
        actualQuantity: parseFloat(it.actualQuantity || it.billQuantity),
        unitPrice: parseFloat(it.unitPrice),
      }));
      const r = await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          discount: parseFloat(editDiscount) || 0,
          transportFee: parseFloat(editTransportFee) || 0,
          date: editDate,
          notes: editNotes,
          truck: editTruck || undefined,
          paymentMethod: sale.saleType === 'shop' ? editPaymentMethod : undefined,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('Sale updated');
        setSale(d.data);
        setShowEdit(false);
      } else {
        toast.error(d.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;
  if (!sale) return <p className="text-gray-500">Sale not found</p>;

  return (
    <div className="max-w-3xl">
      {/* Screen header */}
      <div className="flex justify-between items-start mb-6 no-print">
        <div>
          <h1 className="text-xl font-bold">{sale.saleNumber}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(sale.date)} · {sale.saleType}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/sales/${id}/invoice`} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">View Invoice</Link>
          <button onClick={() => window.print()} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Print Invoice</button>
          {sale.status === 'active' && (
            <button onClick={openEdit} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Edit Sale</button>
          )}
        </div>
      </div>

      {sale.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 no-print">
          <p className="text-red-700 font-medium text-sm">This sale was cancelled</p>
          {sale.cancellationReason && <p className="text-red-600 text-xs mt-1">Reason: {sale.cancellationReason}</p>}
        </div>
      )}

      {sale.editedAt && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 no-print">
          <p className="text-amber-700 text-sm">Last edited {formatDateTime(sale.editedAt)} by {sale.editedByName}</p>
        </div>
      )}

      {/* Printable Invoice */}
      <div className="bg-white border rounded-lg p-6 print:border-0 print:p-0">
        {/* Print Header */}
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-sm text-gray-500 mt-1">Ecana Family Limited</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-lg">{sale.saleNumber}</p>
              <p className="text-gray-500">{formatDate(sale.date)}</p>
              {sale.status === 'cancelled' && (
                <p className="font-medium mt-1 text-red-600">CANCELLED</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Delivery */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">BILL TO</p>
            <p className="font-semibold">{sale.customerName}</p>
            {sale.customerPhone && <p className="text-gray-600">{sale.customerPhone}</p>}
            {sale.customerAddress && <p className="text-gray-600">{sale.customerAddress}</p>}
          </div>
          {sale.truckPlate && (
            <div>
              <p className="text-xs text-gray-500 mb-1">DELIVERY</p>
              <p className="font-medium">{sale.truckPlate}</p>
              {sale.driverName && <p className="text-gray-600">Driver: {sale.driverName}</p>}
            </div>
          )}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sale.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2">
                  {item.itemType === 'cement' ? (
                    <>
                      <p className="font-medium">{item.cementBrandName} Cement</p>
                      <p className="text-xs text-gray-500">ATC: {formatAtcNumber(item)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{item.quarryName} — {item.size}</p>
                      <p className="text-xs text-gray-500">Aggregate / Quarry Product</p>
                    </>
                  )}
                </td>
                <td className="py-2 text-right">{item.billQuantity} {item.itemType === 'cement' ? 'bags' : 'tonnes'}</td>
                <td className="py-2 text-right">{formatNaira(item.unitPrice)}</td>
                <td className="py-2 text-right font-medium">{formatNaira(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatNaira(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatNaira(sale.discount)}</span>
              </div>
            )}
            {sale.transportFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Transport</span>
                <span>{formatNaira(sale.transportFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Grand Total</span>
              <span>{formatNaira(sale.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 border-t pt-4 text-xs text-gray-500">
          {sale.notes && <p>Notes: {sale.notes}</p>}
          <p className="mt-1">Recorded by: {sale.createdByName}</p>
        </div>

        <div className="mt-6 pt-4 text-center text-xs text-gray-400">
          Thank you for your business.
        </div>
      </div>

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Delete Sale</h2>
            <p className="text-sm text-gray-500 mb-4">This permanently removes this sale, refunds the customer's balance (if any), and restores ATC bags / shop stock. This cannot be undone.</p>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
              placeholder="Reason for deletion..." rows={3}
              className="w-full px-3 py-2 border rounded text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2 border rounded text-sm">Go Back</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit ${sale.saleNumber}`} size="xl">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">Items</h3>
              <button
                type="button"
                onClick={() => { setShowEdit(false); setShowDelete(true); }}
                className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-xs font-medium hover:bg-red-50"
              >
                Delete Sale
              </button>
            </div>
            {editItems.map((item, i) => (
              <div key={i} className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{item.label}</p>
                  <button
                    type="button"
                    onClick={() => removeEditItem(i)}
                    className="px-2 py-1 border border-red-300 text-red-600 rounded text-xs font-medium hover:bg-red-50"
                  >
                    Remove Sales Item
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Bill Qty">
                    <input type="number" step="0.01" min="0.01" value={item.billQuantity}
                      onChange={e => updateEditItem(i, 'billQuantity', e.target.value)} className={inputCls} />
                  </Field>
                  {item.itemType !== 'shop' && (
                    <Field label="Actual Qty">
                      <input type="number" step="0.01" min="0.01" value={item.actualQuantity}
                        onChange={e => updateEditItem(i, 'actualQuantity', e.target.value)} className={inputCls} />
                    </Field>
                  )}
                  <Field label="Unit Price (₦)">
                    <CurrencyInput value={item.unitPrice} onChange={val => updateEditItem(i, 'unitPrice', val)} className={inputCls} />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount (₦)">
              <CurrencyInput value={editDiscount} onChange={setEditDiscount} className={inputCls} />
            </Field>
            <Field label="Transport Fee (₦)">
              <CurrencyInput value={editTransportFee} onChange={setEditTransportFee} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Truck (optional)">
              <select value={editTruck} onChange={e => setEditTruck(e.target.value)} className={inputCls}>
                <option value="">No truck</option>
                {trucks.map(t => <option key={t._id} value={t._id}>{t.plateNumber} — {t.driverName}</option>)}
              </select>
            </Field>
          </div>

          {sale.saleType === 'shop' && (
            <Field label="Payment Method" required>
              <select value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
                <option value="pos">POS</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
          )}

          <Field label="Notes">
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className={inputCls} />
          </Field>

          <div className="bg-gray-50 rounded p-3 text-right text-sm">
            <p className="text-gray-500">Subtotal: {formatNaira(editSubtotal)}</p>
            <p className="font-bold text-base">New Grand Total: {formatNaira(editGrandTotal)}</p>
          </div>

          <FormButtons onCancel={() => setShowEdit(false)} submitting={saving} submitLabel="Save Changes" />
        </form>
      </Modal>
    </div>
  );
}
