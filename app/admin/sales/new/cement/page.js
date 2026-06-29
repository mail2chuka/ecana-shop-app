'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira } from '@/lib/format';

export default function NewCementSalePage() {
  const router = useRouter();
  const [atcs, setAtcs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const formatAtcNumber = (atc) => {
    const brand = brands.find(b => b._id === atc.cementBrand);
    const abbr = brand?.abbreviation || '???';
    return `${abbr}-${atc.atcNumber}`;
  };

  // ATC selection
  const [selectedAtcId, setSelectedAtcId] = useState('');
  const selectedAtc = atcs.find(a => a._id === selectedAtcId);

  // Distribution items (customer + quantity pairs)
  const [distributions, setDistributions] = useState([]);

  // Add distribution form
  const [addCustomerSearch, setAddCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [addQty, setAddQty] = useState('');
  const [addUnitPrice, setAddUnitPrice] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addNotes, setAddNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/atcs?availableForSale=true').then(r => r.json()),
      fetch('/api/cement-brands').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]).then(([a, b, c]) => {
      if (a.success) setAtcs(a.data);
      if (b.success) setBrands(b.data);
      if (c.success) setCustomers(c.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (addCustomerSearch) {
      setFilteredCustomers(
        customers.filter(c =>
          c.name.toLowerCase().includes(addCustomerSearch.toLowerCase()) ||
          c.phone.includes(addCustomerSearch) ||
          (c.businessName || '').toLowerCase().includes(addCustomerSearch.toLowerCase())
        )
      );
      setShowCustomerDrop(true);
    } else {
      setFilteredCustomers(customers.slice(0, 15));
    }
  }, [addCustomerSearch, customers]);

  const totalBagsDistributed = distributions.reduce((sum, d) => sum + d.quantity, 0);
  const bagsRemaining = selectedAtc ? selectedAtc.bagsRemaining - totalBagsDistributed : 0;

  const addDistribution = (customer) => {
    if (!addQty || !addUnitPrice) {
      toast.error('Enter quantity and price');
      return;
    }
    const qty = parseFloat(addQty);
    if (qty <= 0 || qty > bagsRemaining) {
      toast.error(`Can only distribute up to ${bagsRemaining} bags remaining`);
      return;
    }

    setDistributions([...distributions, {
      customer: customer._id,
      customerName: customer.name,
      businessName: customer.businessName || '',
      phone: customer.phone,
      quantity: qty,
      unitPrice: parseFloat(addUnitPrice),
      total: qty * parseFloat(addUnitPrice),
      date: addDate,
      notes: addNotes,
    }]);

    setAddCustomerSearch('');
    setAddQty('');
    setAddUnitPrice('');
    setAddNotes('');
    setShowCustomerDrop(false);
    toast.success('Added to distribution');
  };

  const removeDistribution = (idx) => {
    setDistributions(distributions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAtc) { toast.error('Select an ATC'); return; }
    if (distributions.length === 0) { toast.error('Add at least one customer'); return; }

    setSubmitting(true);
    try {
      for (const dist of distributions) {
        const saleBody = {
          saleNumber: `${formatAtcNumber(selectedAtc)}-${Date.now()}`, // Unique per customer
          saleType: 'cement',
          customer: dist.customer,
          customerName: dist.customerName,
          customerPhone: dist.phone,
          date: new Date(dist.date),
          items: [{
            itemType: 'cement',
            atc: selectedAtc._id,
            atcNumber: selectedAtc.atcNumber,
            cementBrand: selectedAtc.cementBrand,
            cementBrandName: selectedAtc.cementBrandName,
            billQuantity: dist.quantity,
            actualQuantity: dist.quantity,
            unitPrice: dist.unitPrice,
            lineTotal: dist.total,
          }],
          subtotal: dist.total,
          discount: 0,
          transportFee: 0,
          grandTotal: dist.total,
          paymentMethod: 'balance',
          notes: dist.notes,
        };

        const r = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleBody),
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.error);
      }

      toast.success(`Created ${distributions.length} sales`);
      router.push('/admin/sales');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Distribute Cement from ATC</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ATC Selection */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Select ATC</label>
          <select value={selectedAtcId} onChange={e => setSelectedAtcId(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" required>
            <option value="">Choose ATC...</option>
            {atcs.map(a => (
              <option key={a._id} value={a._id}>
                {formatAtcNumber(a)} — {a.cementBrandName} — {a.bagsRemaining} bags available
              </option>
            ))}
          </select>
        </div>

        {selectedAtc && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <p className="text-sm"><span className="font-medium">ATC:</span> {formatAtcNumber(selectedAtc)}</p>
            <p className="text-sm"><span className="font-medium">Brand:</span> {selectedAtc.cementBrandName}</p>
            <p className="text-sm"><span className="font-medium">Total Bags:</span> {selectedAtc.bagsPaidFor}</p>
            <p className="text-sm"><span className="font-medium">Bags Remaining to Distribute:</span> <span className={bagsRemaining <= 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{bagsRemaining}</span></p>
          </div>
        )}

        {/* Add Customer Form */}
        {selectedAtc && bagsRemaining > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Add Customer to Distribution</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <input
                  type="text"
                  value={addCustomerSearch}
                  onChange={e => setAddCustomerSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                {showCustomerDrop && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-t-0 rounded-b mt-0 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setAddCustomerSearch(c.name);
                          setShowCustomerDrop(false);
                          // Store the customer object for later use
                          window.selectedCustomerForDist = c;
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b"
                      >
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.phone} · Bal: {formatNaira(c.balance)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity (bags)</label>
                  <input type="number" min="1" value={addQty} onChange={e => setAddQty(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price (₦)</label>
                  <input type="number" step="0.01" value={addUnitPrice} onChange={e => setAddUnitPrice(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input type="text" value={addNotes} onChange={e => setAddNotes(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" placeholder="Delivery notes..." />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!window.selectedCustomerForDist) {
                    toast.error('Select a customer from the list');
                    return;
                  }
                  addDistribution(window.selectedCustomerForDist);
                }}
                className="w-full py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add to Distribution
              </button>
            </div>
          </div>
        )}

        {/* Distribution List */}
        {distributions.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Distribution Plan ({distributions.length} customers)</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-right">Qty (bags)</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {distributions.map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{d.customerName}</p>
                      <p className="text-xs text-gray-500">{d.phone}</p>
                    </td>
                    <td className="px-3 py-2 text-right">{d.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatNaira(d.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatNaira(d.total)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeDistribution(i)} className="text-red-600 text-xs hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <p><span className="font-medium">Total bags distributed:</span> {totalBagsDistributed}</p>
              <p><span className="font-medium">Total amount:</span> {formatNaira(distributions.reduce((s, d) => s + d.total, 0))}</p>
              <p className={`${bagsRemaining >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                Bags remaining: {bagsRemaining}
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting || !selectedAtc || distributions.length === 0} className="flex-1 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50">
            {submitting ? 'Creating Sales...' : `Create ${distributions.length} Sale${distributions.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
