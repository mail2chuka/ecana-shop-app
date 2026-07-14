'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput, btnPrimaryCls, tableActionCls, tableDangerActionCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatNaira, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = { size: '', currentPricePerTonne: '' };
const blankPurchaseForm = { stoneDustProduct: '', truck: '', tonnage: '', date: new Date().toISOString().split('T')[0] };

export default function QuarryDetailPage() {
  const { id } = useParams();
  const [quarry, setQuarry] = useState(null);
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [priceModal, setPriceModal] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(blankPurchaseForm);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  const load = async () => {
    const [sRes, pRes, tRes, qpRes] = await Promise.all([
      fetch('/api/suppliers?type=quarry').then(r => r.json()),
      fetch('/api/stonedust').then(r => r.json()),
      fetch('/api/trucks').then(r => r.json()),
      fetch(`/api/quarry-purchases?quarry=${id}`).then(r => r.json()),
    ]);
    if (sRes.success) setQuarry(sRes.data.find(s => s._id === id) || null);
    if (pRes.success) setProducts(pRes.data.filter(p => p.quarry === id));
    if (tRes.success) setTrucks(tRes.data.filter(t => t.type === 'stonedust'));
    if (qpRes.success) setPurchases(qpRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const openCreate = () => { setEditing(null); setForm(blankForm); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ size: p.size, currentPricePerTonne: p.currentPricePerTonne });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `/api/stonedust/${editing._id}` : '/api/stonedust';
      const method = editing ? 'PUT' : 'POST';
      const body = { ...form, quarry: id, currentPricePerTonne: Number(form.currentPricePerTonne) };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(editing ? 'Updated' : 'Product added'); setShowModal(false); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const openRecordPurchase = () => { setPurchaseForm(blankPurchaseForm); setShowPurchaseModal(true); };

  const selectedPurchaseProduct = products.find(p => p._id === purchaseForm.stoneDustProduct);
  const purchaseCostPerTonne = selectedPurchaseProduct?.currentPricePerTonne || 0;
  const purchaseTotal = (Number(purchaseForm.tonnage) || 0) * purchaseCostPerTonne;

  const handleRecordPurchase = async (e) => {
    e.preventDefault();
    setSubmittingPurchase(true);
    try {
      const r = await fetch('/api/quarry-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarry: id,
          stoneDustProduct: purchaseForm.stoneDustProduct,
          truck: purchaseForm.truck,
          tonnage: Number(purchaseForm.tonnage),
          date: purchaseForm.date,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Purchase recorded — reference ${d.data.referenceNumber}`);
        setShowPurchaseModal(false);
        load();
      } else {
        toast.error(d.error);
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Deactivate ${p.size}?`)) return;
    const r = await fetch(`/api/stonedust/${p._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success('Deactivated'); load(); }
    else toast.error(d.error);
  };

  const handlePriceChange = async (e) => {
    e.preventDefault();
    const r = await fetch(`/api/stonedust/${priceModal._id}/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPrice: Number(newPrice), reason: priceReason }),
    });
    const d = await r.json();
    if (d.success) { toast.success('Price updated'); setPriceModal(null); setNewPrice(''); setPriceReason(''); load(); }
    else toast.error(d.error);
  };

  if (loading) return <Loader />;
  if (!quarry) return <p className="text-gray-500">Quarry not found</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/suppliers" className="text-sm text-green-800 hover:underline">← Back to Quarries</Link>
        <div className="flex flex-wrap justify-between items-center gap-3 mt-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quarry.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{quarry.phone || 'No phone'} {quarry.address ? `· ${quarry.address}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openRecordPurchase} className={btnPrimaryCls} disabled={products.length === 0 || trucks.length === 0}>Record Purchase</button>
            <button onClick={openCreate} className={btnPrimaryCls}>Add Product</button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden mb-6">
        <div className={tableScrollCls}>
        <table className="w-full text-sm">
          <thead className={theadCls}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">Size</th>
              <th className="px-4 py-3 text-right font-medium">Cost / Tonne</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 && <EmptyRow colSpan={3} text="No products added for this quarry yet" />}
            {products.map(p => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-medium">{p.size}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNaira(p.currentPricePerTonne)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setPriceModal(p); setNewPrice(p.currentPricePerTonne); }} className={`${tableActionCls} mr-3`}>Price</button>
                  <button onClick={() => openEdit(p)} className={`${tableActionCls} mr-3`}>Edit</button>
                  <button onClick={() => handleDelete(p)} className={tableDangerActionCls}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <div className="mb-3">
        <h2 className="font-semibold text-sm text-gray-700">Purchases from this Quarry</h2>
      </div>
      <Card className="overflow-hidden">
        <div className={tableScrollCls}>
        <table className="w-full text-sm">
          <thead className={theadCls}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ref</th>
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Truck</th>
              <th className="px-4 py-3 text-right font-medium">Tonnage</th>
              <th className="px-4 py-3 text-right font-medium">Remaining</th>
              <th className="px-4 py-3 text-right font-medium">Cost / Tonne</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchases.length === 0 && <EmptyRow colSpan={8} text="No purchases recorded for this quarry yet" />}
            {purchases.map(p => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-medium">{p.referenceNumber}</td>
                <td className="px-4 py-3">{p.size}</td>
                <td className="px-4 py-3 text-gray-600">{p.truckPlate}</td>
                <td className="px-4 py-3 text-right">{p.tonnage}</td>
                <td className="px-4 py-3 text-right">{p.tonnesRemaining}</td>
                <td className="px-4 py-3 text-right">{formatNaira(p.costPricePerTonne)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNaira(p.totalCost)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : `Add Product — ${quarry.name}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Size" required>
            <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className={inputCls} required placeholder="e.g. 6mm, 10mm, 20mm" />
          </Field>
          <Field label={editing ? 'Cost per tonne (use Price button to change)' : 'Cost per tonne (₦)'} required={!editing}>
            <CurrencyInput value={form.currentPricePerTonne} onChange={val => setForm({ ...form, currentPricePerTonne: val })} className={inputCls} required={!editing} disabled={editing} />
          </Field>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>

      <Modal open={showPurchaseModal} onClose={() => setShowPurchaseModal(false)} title={`Record Purchase — ${quarry.name}`}>
        <form onSubmit={handleRecordPurchase} className="space-y-4">
          <Field label="Product" required>
            <select value={purchaseForm.stoneDustProduct} onChange={e => setPurchaseForm({ ...purchaseForm, stoneDustProduct: e.target.value })} className={inputCls} required>
              <option value="">Choose product...</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.size}</option>)}
            </select>
          </Field>
          <Field label="Truck" required>
            <select value={purchaseForm.truck} onChange={e => setPurchaseForm({ ...purchaseForm, truck: e.target.value })} className={inputCls} required>
              <option value="">Choose truck...</option>
              {trucks.map(t => <option key={t._id} value={t._id}>{t.plateNumber} — {t.driverName}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tonnage" required>
              <input type="number" step="0.01" min="0.01" value={purchaseForm.tonnage} onChange={e => setPurchaseForm({ ...purchaseForm, tonnage: e.target.value })} className={inputCls} required />
            </Field>
            <Field label="Date" required>
              <input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} className={inputCls} required />
            </Field>
          </div>
          {selectedPurchaseProduct && (
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><span className="text-gray-500">Cost / Tonne:</span> <span className="font-medium">{formatNaira(purchaseCostPerTonne)}</span></p>
              <p><span className="text-gray-500">Total:</span> <span className="font-medium">{formatNaira(purchaseTotal)}</span></p>
            </div>
          )}
          <FormButtons onCancel={() => setShowPurchaseModal(false)} submitting={submittingPurchase} submitLabel="Record Purchase" />
        </form>
      </Modal>

      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title="Update Cost">
        {priceModal && (
          <form onSubmit={handlePriceChange} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><span className="text-gray-500">Product:</span> <span className="font-medium">{quarry.name} — {priceModal.size}</span></p>
              <p><span className="text-gray-500">Current:</span> <span className="font-medium">{formatNaira(priceModal.currentPricePerTonne)}</span></p>
            </div>
            <Field label="New cost (₦/tonne)" required>
              <CurrencyInput value={newPrice} onChange={setNewPrice} className={inputCls} required />
            </Field>
            <Field label="Reason">
              <input type="text" value={priceReason} onChange={e => setPriceReason(e.target.value)} className={inputCls} placeholder="optional" />
            </Field>
            <FormButtons onCancel={() => setPriceModal(null)} submitLabel="Update Cost" />
          </form>
        )}
      </Modal>
    </div>
  );
}
