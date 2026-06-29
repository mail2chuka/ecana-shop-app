'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira } from '@/lib/format';

export default function NewStoneDustSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [truckId, setTruckId] = useState('');
  const [discount, setDiscount] = useState('');
  const [transportFee, setTransportFee] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [items, setItems] = useState([]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [modalProduct, setModalProduct] = useState('');
  const [modalBillQty, setModalBillQty] = useState('');
  const [modalActualQty, setModalActualQty] = useState('');
  const [modalUnitPrice, setModalUnitPrice] = useState('');
  const [modalTotal, setModalTotal] = useState('');

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
        (c.businessName || '').toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers.slice(0, 20);

  const handleUnitPriceChange = (val) => {
    setModalUnitPrice(val);
    if (modalBillQty && val) setModalTotal((parseFloat(modalBillQty) * parseFloat(val)).toFixed(2));
  };

  const handleTotalChange = (val) => {
    setModalTotal(val);
    if (modalBillQty && val && parseFloat(modalBillQty) > 0) {
      setModalUnitPrice((parseFloat(val) / parseFloat(modalBillQty)).toFixed(2));
    }
  };

  const addItem = () => {
    if (!modalProduct || !modalBillQty || !modalUnitPrice) {
      toast.error('Select product, quantity and price'); return;
    }
    const prod = products.find(p => p._id === modalProduct);
    setItems(prev => [...prev, {
      itemType: 'stonedust',
      stoneDustProduct: prod._id,
      quarryName: prod.quarryName,
      size: prod.size,
      billQuantity: parseFloat(modalBillQty),
      actualQuantity: parseFloat(modalActualQty || modalBillQty),
      unitPrice: parseFloat(modalUnitPrice),
      lineTotal: parseFloat(modalTotal || (parseFloat(modalBillQty) * parseFloat(modalUnitPrice))),
    }]);
    setShowItemModal(false);
    setModalProduct(''); setModalBillQty(''); setModalActualQty('');
    setModalUnitPrice(''); setModalTotal('');
  };

  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const grandTotal = subtotal - (parseFloat(discount) || 0) + (parseFloat(transportFee) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) { toast.error('Select a customer'); return; }
    if (items.length === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saleType: 'stonedust',
        customer: selectedCustomer._id,
        truck: truckId || undefined,
        date, items,
        discount: parseFloat(discount) || 0,
        transportFee: parseFloat(transportFee) || 0,
        notes,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      toast.success(`Sale ${data.data.saleNumber} created`);
      router.push(`/admin/sales/${data.data._id}`);
    } else {
      toast.error(data.error);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">New Stone Dust Sale</h1>
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
                <p className="font-medium text-sm">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500">{selectedCustomer.phone} · Balance: <span className={selectedCustomer.balance < 0 ? 'text-red-600' : 'text-green-600'}>{formatNaira(selectedCustomer.balance)}</span></p>
              </div>
              <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-xs text-red-500">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" placeholder="Search customer..." value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                onFocus={() => setShowCustomerDrop(true)}
                className="w-full px-3 py-2 border rounded text-sm" />
              {showCustomerDrop && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button key={c._id} type="button"
                      onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false); setCustomerSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                      <p className="font-medium">{c.name} {c.businessName && `(${c.businessName})`}</p>
                      <p className="text-xs text-gray-500">{c.phone} · Bal: {formatNaira(c.balance)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-sm">Sale Items</h3>
            <button type="button" onClick={() => setShowItemModal(true)} className="px-3 py-1 bg-gray-900 text-white rounded text-sm">+ Add Item</button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No items yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-right">Bill Qty</th>
                <th className="px-3 py-2 text-right">Actual Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr></thead>
              <tbody className="divide-y">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2"><p className="font-medium">{item.quarryName}</p><p className="text-xs text-gray-500">{item.size}</p></td>
                    <td className="px-3 py-2 text-right">{item.billQuantity}t</td>
                    <td className="px-3 py-2 text-right">{item.actualQuantity}t</td>
                    <td className="px-3 py-2 text-right">{formatNaira(item.unitPrice)}/t</td>
                    <td className="px-3 py-2 text-right font-medium">{formatNaira(item.lineTotal)}</td>
                    <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeItem(i)} className="text-red-500 text-xs">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Discount (₦)</label>
            <input type="number" step="0.01" min="0" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Transport Fee (₦)</label>
            <input type="number" step="0.01" min="0" value={transportFee} onChange={e => setTransportFee(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border rounded text-sm" />
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

      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Stone Dust Item</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select value={modalProduct}
                  onChange={e => { setModalProduct(e.target.value); const p = products.find(x => x._id === e.target.value); if (p) setModalUnitPrice(String(p.currentPricePerTonne)); }}
                  className="w-full px-3 py-2 border rounded text-sm">
                  <option value="">Choose product...</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.quarryName} — {p.size}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Bill Qty (tonnes)</label>
                  <input type="number" step="0.01" min="0.01" value={modalBillQty}
                    onChange={e => { setModalBillQty(e.target.value); if (modalUnitPrice) setModalTotal((parseFloat(e.target.value || 0) * parseFloat(modalUnitPrice)).toFixed(2)); }}
                    className="w-full px-3 py-2 border rounded text-sm" placeholder="Customer pays for" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Actual Qty (tonnes)</label>
                  <input type="number" step="0.01" min="0.01" value={modalActualQty} onChange={e => setModalActualQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm" placeholder="From quarry" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Price per Tonne (₦)</label>
                  <input type="number" step="0.01" min="0" value={modalUnitPrice} onChange={e => handleUnitPriceChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount (₦)</label>
                  <input type="number" step="0.01" min="0" value={modalTotal} onChange={e => handleTotalChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowItemModal(false)} className="flex-1 px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={addItem} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded text-sm">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
