'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira } from '@/lib/format';

export default function WalkInSalePage() {
  const router = useRouter();
  const [atcs, setAtcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shopId, setShopId] = useState(null);

  // Form state
  const [selectedAtc, setSelectedAtc] = useState('');
  const [bags, setBags] = useState('');
  const [pricePerBag, setPricePerBag] = useState('');
  const [notes, setNotes] = useState('');
  const [sales, setSales] = useState([]);

  const selectedAtcData = atcs.find(a => a._id === selectedAtc);
  const total = bags && pricePerBag ? (parseFloat(bags) * parseFloat(pricePerBag)).toFixed(2) : '0.00';
  const totalBagsSold = sales.reduce((sum, s) => sum + s.bags, 0);
  const bagsRemaining = selectedAtcData ? selectedAtcData.bagsRemaining - totalBagsSold : 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get shop customer
        const shopRes = await fetch('/api/customers?search=Shop');
        const shopData = await shopRes.json();
        const shop = shopData.data?.find(c => c.name.toLowerCase().includes('shop'));
        if (shop) setShopId(shop._id);

        // Load ATCs
        const atcRes = await fetch('/api/atcs?availableForSale=true');
        const atcData = await atcRes.json();
        if (atcData.success) setAtcs(atcData.data.filter(a => a.bagsRemaining > 0));
      } catch (err) {
        console.error('Error loading:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const addSale = () => {
    if (!selectedAtc || !bags || !pricePerBag) {
      toast.error('Select ATC, enter bags and price');
      return;
    }

    const bagCount = parseFloat(bags);
    if (bagCount <= 0 || bagCount > bagsRemaining) {
      toast.error(`Can only sell up to ${bagsRemaining} bags remaining`);
      return;
    }

    setSales([...sales, {
      id: Date.now(),
      atcId: selectedAtc,
      atcNumber: selectedAtcData.atcNumber,
      brand: selectedAtcData.cementBrandName,
      bags: bagCount,
      price: parseFloat(pricePerBag),
      total: bagCount * parseFloat(pricePerBag),
      notes,
    }]);

    setBags('');
    setPricePerBag('');
    setNotes('');
    toast.success('Sale added');
  };

  const removeSale = (id) => {
    setSales(sales.filter(s => s.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sales.length === 0) {
      toast.error('Add at least one sale');
      return;
    }

    setSubmitting(true);
    try {
      for (const sale of sales) {
        const atc = atcs.find(a => a._id === sale.atcId);
        const saleBody = {
          saleType: 'cement',
          customer: shopId,
          customerName: 'Walk-in Customer',
          date: new Date(),
          items: [{
            itemType: 'cement',
            atc: sale.atcId,
            atcNumber: sale.atcNumber,
            cementBrand: atc.cementBrand,
            cementBrandName: sale.brand,
            billQuantity: sale.bags,
            actualQuantity: sale.bags,
            unitPrice: sale.price,
            lineTotal: sale.total,
          }],
          subtotal: sale.total,
          discount: 0,
          transportFee: 0,
          grandTotal: sale.total,
          paymentMethod: 'balance',
          notes: sale.notes,
        };

        const r = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleBody),
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.error);
      }

      toast.success(`${sales.length} walk-in sales recorded`);
      router.push('/admin/shop-inventory');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Walk-in Cement Sales</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ATC Selection */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Select ATC</label>
          <select
            value={selectedAtc}
            onChange={e => setSelectedAtc(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            required
          >
            <option value="">Choose ATC...</option>
            {atcs.map(a => (
              <option key={a._id} value={a._id}>
                {a.atcNumber} — {a.cementBrandName} — {a.bagsRemaining} bags available
              </option>
            ))}
          </select>

          {selectedAtcData && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded space-y-1 text-sm">
              <p><span className="font-medium">Brand:</span> {selectedAtcData.cementBrandName}</p>
              <p><span className="font-medium">Total in ATC:</span> {selectedAtcData.bagsPaidFor} bags</p>
              <p className="font-bold text-green-600">Available Now: {bagsRemaining} bags</p>
            </div>
          )}
        </div>

        {/* Quick Sale Entry */}
        {selectedAtc && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-4">Add Sale</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1">Bags</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={bags}
                  onChange={e => setBags(e.target.value)}
                  className="w-full px-2 py-2 border rounded text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Price/Bag (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricePerBag}
                  onChange={e => setPricePerBag(e.target.value)}
                  className="w-full px-2 py-2 border rounded text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Total (₦)</label>
                <div className="w-full px-2 py-2 border rounded text-sm bg-gray-50 font-medium">
                  {formatNaira(total)}
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={addSale}
                  className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Delivery notes..."
                className="w-full px-2 py-2 border rounded text-sm"
              />
            </div>
          </div>
        )}

        {/* Sales List */}
        {sales.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Sales Summary ({sales.length})</h3>
            <div className="space-y-2">
              {sales.map((s, i) => (
                <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                  <div className="text-sm">
                    <p className="font-medium">{s.atcNumber} — {s.brand}</p>
                    <p className="text-xs text-gray-600">{s.bags} bags × {formatNaira(s.price)} = {formatNaira(s.total)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSale(s.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t text-sm font-bold">
              <p>Total Amount: {formatNaira(sales.reduce((s, x) => s + x.total, 0))}</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2 border rounded text-sm hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || sales.length === 0}
            className="flex-1 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Recording...' : `Record ${sales.length} Sale${sales.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
