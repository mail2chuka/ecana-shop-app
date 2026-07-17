'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatNaira, formatCustomerLabel } from '@/lib/format';
import { CurrencyInput } from '@/components/ui';

export default function NewCementSalePage() {
  const router = useRouter();
  const [atcs, setAtcs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transportFee, setTransportFee] = useState('');
  const [showTransportWarning, setShowTransportWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const formatAtcNumber = (atc) => {
    const brand = brands.find(b => b._id === atc.cementBrand);
    const abbr = brand?.abbreviation || '???';
    return `${abbr}-${atc.atcNumber}`;
  };

  const formatStatusHours = (atc) => {
    const isArrived = atc.status === 'arrived';
    const since = isArrived ? atc.arrivalDate : atc.loadedAt;
    const label = isArrived ? 'Arrived' : 'Loaded';
    if (!since) return label;
    const hours = Math.floor((Date.now() - new Date(since).getTime()) / (60 * 60 * 1000));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${label} (${days} day${days === 1 ? '' : 's'})`;
    }
    return `${label} (${hours <= 0 ? '<1' : hours}hr${hours === 1 ? '' : 's'})`;
  };

  // ATC Selection
  const [selectedAtcId, setSelectedAtcId] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [showAtcDrop, setShowAtcDrop] = useState(false);
  const selectedAtc = atcs.find(a => a._id === selectedAtcId);
  const selectedTruckId = selectedAtc?.assignedTruck || '';

  const atcStatusPriority = { arrived: 0, loaded: 1 };
  const sortedAtcs = atcs
    .filter(a => !brandFilter || a.cementBrand === brandFilter)
    .slice()
    .sort((x, y) => {
      const px = atcStatusPriority[x.status] ?? 2;
      const py = atcStatusPriority[y.status] ?? 2;
      if (px !== py) return px - py;
      const dx = new Date(x.arrivalDate || x.loadedAt || x.atcDate).getTime();
      const dy = new Date(y.arrivalDate || y.loadedAt || y.atcDate).getTime();
      return dx - dy;
    });

  // Sales distribution items
  const [distributions, setDistributions] = useState([]);

  // Form for adding a customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [formCustomer, setFormCustomer] = useState(null);
  const [formQty, setFormQty] = useState('');
  const [formBillQty, setFormBillQty] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

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
    if (customerSearch) {
      setFilteredCustomers(
        customers.filter(c =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch) ||
          (c.customerId || '').includes(customerSearch)
        )
      );
      setShowCustomerDrop(true);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  const totalBagsDistributed = distributions.reduce((sum, d) => sum + d.qty, 0);
  const bagsRemaining = selectedAtc ? selectedAtc.bagsRemaining - totalBagsDistributed : 0;

  const addCustomerToDistribution = () => {
    if (!formCustomer) {
      toast.error('Select a customer');
      return;
    }
    if (!formQty || !formPrice) {
      toast.error('Enter quantity and price');
      return;
    }

    const qty = parseFloat(formQty);
    const billQty = formBillQty ? parseFloat(formBillQty) : qty;
    const price = parseFloat(formPrice);

    if (qty <= 0 || qty > bagsRemaining) {
      toast.error(`Can only distribute up to ${bagsRemaining} bags remaining`);
      return;
    }

    setDistributions([...distributions, {
      id: Date.now(),
      customer: formCustomer._id,
      customerName: formatCustomerLabel(formCustomer),
      qty,
      billQty,
      price,
      total: billQty * price,
      notes: formNotes,
    }]);

    setFormCustomer(null);
    setCustomerSearch('');
    setFormQty('');
    setFormBillQty('');
    setFormPrice('');
    setFormNotes('');
    setShowCustomerDrop(false);
    toast.success('Customer added');
  };

  const removeDistribution = (id) => {
    setDistributions(distributions.filter(d => d.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAtc) { toast.error('Select a truck'); return; }
    if (distributions.length === 0) { toast.error('Add at least one customer'); return; }

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
      for (const dist of distributions) {
        const saleBody = {
          saleType: 'cement',
          customer: dist.customer,
          customerName: dist.customerName,
          truck: selectedTruckId || null,
          date: new Date(),
          items: [{
            itemType: 'cement',
            atc: selectedAtc._id,
            atcNumber: selectedAtc.atcNumber,
            cementBrand: selectedAtc.cementBrand,
            cementBrandName: selectedAtc.cementBrandName,
            billQuantity: dist.billQty,
            actualQuantity: dist.qty,
            unitPrice: dist.price,
            lineTotal: dist.total,
          }],
          subtotal: dist.total,
          discount: 0,
          transportFee: parseFloat(transportFee) || 0,
          grandTotal: dist.total + (parseFloat(transportFee) || 0),
          paymentMethod: 'balance',
          notes: dist.notes,
        };

        const r = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleBody),
        });
        const d = await r.json();
        if (!d.success) throw new Error(`Failed for ${dist.customerName}: ${d.error}`);
      }

      toast.success(`Created ${distributions.length} sales`);
      router.push('/admin/sales');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
      setPendingSubmit(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">Cement Sale</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ATC Selection */}
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Brand (optional)</label>
            <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setSelectedAtcId(''); }} className="w-full px-3 py-2 border rounded text-sm">
              <option value="">All Brands</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name}{b.grade ? ` (${b.grade})` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Truck</label>
              <button type="button" onClick={() => setShowAtcDrop(v => !v)} className="w-full px-3 py-2 border rounded text-sm text-left bg-white">
                {selectedAtc ? `${selectedAtc.assignedTruckPlate || 'No truck'} - ${formatStatusHours(selectedAtc)} (${selectedAtc.bagsRemaining} bags)` : 'Choose truck...'}
              </button>
              {showAtcDrop && (
                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-64 overflow-y-auto">
                  {sortedAtcs.length === 0 && <p className="px-3 py-3 text-sm text-gray-500">No loaded or arrived trucks available</p>}
                  {sortedAtcs.map(a => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => { setSelectedAtcId(a._id); setShowAtcDrop(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-0"
                    >
                      <p>{a.assignedTruckPlate || 'No truck'} - {formatStatusHours(a)} · {a.bagsRemaining} bags left</p>
                      <p className="text-xs text-gray-500">
                        {formatAtcNumber(a)}{a.assignedDriverPhone ? ` (${a.assignedDriverPhone})` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ATC</label>
              <div className="w-full px-3 py-2 border rounded text-sm bg-gray-50 text-gray-700">
                {selectedAtc ? formatAtcNumber(selectedAtc) : '—'}
              </div>
            </div>
          </div>

          {selectedAtc && (
            <div className="bg-green-50 border border-green-300 rounded p-3 space-y-1 text-sm">
              <p><span className="font-medium">Brand:</span> {selectedAtc.cementBrandName}</p>
              <p><span className="font-medium">Total Bags in ATC:</span> {selectedAtc.bagsPaidFor}</p>
              <p className={`font-medium ${bagsRemaining <= 0 ? 'text-amber-700' : 'text-green-600'}`}>Remaining: {bagsRemaining} bags</p>
            </div>
          )}
        </div>

        {/* Add Customer Distribution */}
        {selectedAtc && bagsRemaining > 0 && (
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-sm">Add Customer Distribution</h3>

            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Customer</label>
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                onFocus={() => setShowCustomerDrop(true)}
                placeholder="Search customer..."
                className="w-full px-3 py-2 border rounded text-sm"
              />
              {showCustomerDrop && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-96 bg-white border border-t-0 rounded-b mt-0 max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setFormCustomer(c);
                        setCustomerSearch(formatCustomerLabel(c));
                        setShowCustomerDrop(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b"
                    >
                      <p className="font-medium">{formatCustomerLabel(c)}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
              {formCustomer && (
                <p className="text-xs text-green-600 mt-1">✓ Selected: {formatCustomerLabel(formCustomer)}</p>
              )}
            </div>

            {/* Distribution Details */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">QTY (Supplied)</label>
                <input
                  type="number"
                  min="1"
                  value={formQty}
                  onChange={e => setFormQty(e.target.value)}
                  placeholder="Qty"
                  className="w-full px-2 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Bill QTY (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={formBillQty}
                  onChange={e => setFormBillQty(e.target.value)}
                  placeholder="Defaults to Qty"
                  className="w-full px-2 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Price/Bag</label>
                <CurrencyInput
                  value={formPrice}
                  onChange={setFormPrice}
                  placeholder="Price"
                  className="w-full px-2 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Total</label>
                <div className="w-full px-2 py-2 border rounded text-sm bg-gray-50 font-medium">
                  {formQty && formPrice ? formatNaira(parseFloat(formBillQty || formQty) * parseFloat(formPrice)) : '-'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Notes (optional)</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Delivery notes..."
                className="w-full px-2 py-2 border rounded text-sm"
              />
            </div>

            <button
              type="button"
              onClick={addCustomerToDistribution}
              className="w-full py-2 bg-green-800 text-neutral-100 rounded text-sm hover:bg-green-900 font-medium"
            >
              Add Sales
            </button>
          </div>
        )}

        {/* Distributions List */}
        {distributions.length > 0 && (
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-sm">Distribution Summary ({distributions.length} customers)</h3>
            <div className="space-y-2">
              {distributions.map((d, i) => (
                <div key={d.id} className="border rounded p-3 bg-gray-50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{d.customerName}</p>
                      <p className="text-xs text-gray-500">Supplied: {d.qty} bags | Billed: {d.billQty} bags</p>
                      <p className="text-xs text-gray-500">Price: {formatNaira(d.price)}/bag</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatNaira(d.total)}</p>
                      <button
                        type="button"
                        onClick={() => removeDistribution(d.id)}
                        className="text-amber-700 text-xs hover:underline mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <p><span className="font-medium">Total bags distributed:</span> {totalBagsDistributed} / {selectedAtc?.bagsPaidFor}</p>
              <p><span className="font-medium">Total amount:</span> {formatNaira(distributions.reduce((s, d) => s + d.total, 0))}</p>
              {bagsRemaining > 0 && (
                <p className="text-green-800"><span className="font-medium">Remaining:</span> {bagsRemaining} bags (add more customers)</p>
              )}
              {bagsRemaining === 0 && (
                <p className="text-green-600 font-medium">✓ All bags distributed</p>
              )}
            </div>
          </div>
        )}

        {/* Transport Fee */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Transport Fee (₦)</label>
          <CurrencyInput
            value={transportFee}
            onChange={setTransportFee}
            placeholder="Enter transport fee (0 if complimentary)"
            className="w-full px-3 py-2 border rounded text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty or enter 0 if transportation is complimentary</p>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => router.back()} className="flex-1 py-3 border rounded text-sm font-bold hover:bg-gray-50">
            CLOSE
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedAtc || distributions.length === 0}
            className="flex-1 py-3 bg-green-800 text-neutral-100 rounded text-sm font-bold hover:bg-green-900 disabled:opacity-50"
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT'}
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
                className="w-full px-4 py-2 bg-amber-700 text-neutral-100 rounded text-sm hover:bg-amber-800 font-medium disabled:opacity-50"
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
