'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira, formatCustomerLabel } from '@/lib/format';
import { CurrencyInput } from '@/components/ui';

export default function NewAggregateSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTransportWarning, setShowTransportWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [truckId, setTruckId] = useState('');
  const [discount, setDiscount] = useState('');
  const [transportFee, setTransportFee] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);

  const [productId, setProductId] = useState('');
  const [billQty, setBillQty] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [total, setTotal] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/stonedust').then(r => r.json()),
      fetch('/api/trucks').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]).then(([p, t, c]) => {
      if (p.success) setProducts(p.data);
      if (t.success) setTrucks(t.data);
      if (c.success) setCustomers(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch) ||
        (c.businessName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.customerId || '').includes(customerSearch)
      )
    : customers.slice(0, 20);

  const selectedProduct = products.find(p => p._id === productId);
  const effectiveBillQty = billQty || actualQty;

  const handleUnitPriceChange = (val) => {
    setUnitPrice(val);
    if (effectiveBillQty && val) setTotal((parseFloat(effectiveBillQty) * parseFloat(val)).toFixed(2));
  };

  const handleTotalChange = (val) => {
    setTotal(val);
    if (effectiveBillQty && val && parseFloat(effectiveBillQty) > 0) {
      setUnitPrice((parseFloat(val) / parseFloat(effectiveBillQty)).toFixed(2));
    }
  };

  const handleActualQtyChange = (val) => {
    setActualQty(val);
    if (!billQty && unitPrice) setTotal((parseFloat(val || 0) * parseFloat(unitPrice)).toFixed(2));
  };

  const handleBillQtyChange = (val) => {
    setBillQty(val);
    if (unitPrice) setTotal((parseFloat(val || actualQty || 0) * parseFloat(unitPrice)).toFixed(2));
  };

  const subtotal = (parseFloat(total) || (parseFloat(effectiveBillQty) || 0) * (parseFloat(unitPrice) || 0)) || 0;
  const grandTotal = subtotal - (parseFloat(discount) || 0) + (parseFloat(transportFee) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) { toast.error('Select a customer'); return; }
    if (!productId || !actualQty || !unitPrice) { toast.error('Select product, quantity and price'); return; }

    if (!transportFee || transportFee === '' || transportFee === '0') {
      setShowTransportWarning(true);
      setPendingSubmit(true);
      return;
    }

    proceedWithSubmit();
  };

  const proceedWithSubmit = async () => {
    setShowTransportWarning(false);
    setSubmitting(true);
    try {
      const item = {
        itemType: 'stonedust',
        stoneDustProduct: selectedProduct._id,
        quarryName: selectedProduct.quarryName,
        size: selectedProduct.size,
        billQuantity: parseFloat(effectiveBillQty),
        actualQuantity: parseFloat(actualQty),
        unitPrice: parseFloat(unitPrice),
        lineTotal: parseFloat(total || (parseFloat(effectiveBillQty) * parseFloat(unitPrice))),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleType: 'stonedust',
          customer: selectedCustomer._id,
          truck: truckId || undefined,
          date, items: [item],
          discount: parseFloat(discount) || 0,
          transportFee: parseFloat(transportFee) || 0,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sale ${data.data.saleNumber} created`);
        router.push(`/admin/sales/${data.data._id}`);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
      setPendingSubmit(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Aggregate Sale</h1>
        <p className="text-sm text-gray-500">Record a quarry product delivery</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-lg p-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Truck (optional)</label>
            <select value={truckId} onChange={e => setTruckId(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
              <option value="">No truck selected</option>
              {trucks.map(t => <option key={t._id} value={t._id}>{t.plateNumber} — {t.driverName}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Customer</label>
          {selectedCustomer ? (
            <div className="flex justify-between items-center bg-gray-50 border rounded px-3 py-2">
              <div>
                <p className="font-medium text-sm">{formatCustomerLabel(selectedCustomer)}</p>
                <p className="text-xs text-gray-500">{selectedCustomer.phone} · Balance: <span className={selectedCustomer.balance < 0 ? 'text-red-600' : 'text-green-600'}>{formatNaira(selectedCustomer.balance)}</span></p>
              </div>
              <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-xs text-red-500">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" placeholder="Search customer by name, phone, or ID..." value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                onFocus={() => setShowCustomerDrop(true)}
                className="w-full px-3 py-2 border rounded text-sm" />
              {showCustomerDrop && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button key={c._id} type="button"
                      onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false); setCustomerSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                      <p className="font-medium">{formatCustomerLabel(c)} {c.businessName && `— ${c.businessName}`}</p>
                      <p className="text-xs text-gray-500">{c.phone} · Bal: {formatNaira(c.balance)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-sm">Product</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Quarry Product</label>
            <select value={productId}
              onChange={e => {
                setProductId(e.target.value);
                const p = products.find(x => x._id === e.target.value);
                if (p) handleUnitPriceChange(String(p.currentPricePerTonne));
              }}
              className="w-full px-3 py-2 border rounded text-sm" required>
              <option value="">Choose product...</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.quarryName} — {p.size}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Actual Qty (tonnes)</label>
              <input type="number" step="0.01" min="0.01" value={actualQty} onChange={e => handleActualQtyChange(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm" placeholder="From quarry" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bill Qty (tonnes, optional)</label>
              <input type="number" step="0.01" min="0.01" value={billQty}
                onChange={e => handleBillQtyChange(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm" placeholder="Defaults to Actual Qty" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Price per Tonne (₦)</label>
              <CurrencyInput value={unitPrice} onChange={handleUnitPriceChange}
                className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Amount (₦)</label>
              <CurrencyInput value={total} onChange={handleTotalChange}
                className="w-full px-3 py-2 border rounded text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Discount (₦)</label>
            <CurrencyInput value={discount} onChange={setDiscount} placeholder="0.00" className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Transport Fee (₦)</label>
            <CurrencyInput value={transportFee} onChange={setTransportFee} placeholder="0.00" className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-gray-50 rounded p-3 text-right">
              <p className="text-xs text-gray-500">Subtotal: {formatNaira(subtotal)}</p>
              <p className="text-lg font-bold">Total: {formatNaira(grandTotal)}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded text-sm">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-50">
            {submitting ? 'Saving...' : 'Create Sale'}
          </button>
        </div>
      </form>

      {/* Transport Fee Warning Modal */}
      {showTransportWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3 text-amber-600">⚠ Transport Fee Not Entered</h2>
            <p className="text-sm text-gray-600 mb-4">
              You haven't entered a transport fee. This is fine if transportation is complimentary, but we want to make sure it wasn't missed by mistake.
            </p>
            <p className="text-sm font-medium text-gray-700 mb-6">Do you want to:</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowTransportWarning(false);
                  setPendingSubmit(false);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 font-medium"
              >
                Go Back & Add Transport Fee
              </button>
              <button
                type="button"
                onClick={proceedWithSubmit}
                disabled={submitting}
                className="w-full px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Continue Without Fee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
