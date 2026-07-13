'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput } from '@/components/ui';
import { formatNaira } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = { size: '', currentPricePerTonne: '' };

export default function QuarryDetailPage() {
  const { id } = useParams();
  const [quarry, setQuarry] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [priceModal, setPriceModal] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');

  const load = async () => {
    const [sRes, pRes] = await Promise.all([
      fetch('/api/suppliers?type=quarry').then(r => r.json()),
      fetch('/api/stonedust').then(r => r.json()),
    ]);
    if (sRes.success) setQuarry(sRes.data.find(s => s._id === id) || null);
    if (pRes.success) setProducts(pRes.data.filter(p => p.quarry === id));
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
          <button onClick={openCreate} className="px-4 py-2 bg-green-800 text-neutral-100 rounded text-sm hover:bg-green-900">Add Product</button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Size</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Price / Tonne</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 && <EmptyRow colSpan={3} text="No products added for this quarry yet" />}
            {products.map(p => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-medium">{p.size}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNaira(p.currentPricePerTonne)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setPriceModal(p); setNewPrice(p.currentPricePerTonne); }} className="text-sm text-green-800 hover:text-green-900 mr-3">Price</button>
                  <button onClick={() => openEdit(p)} className="text-sm text-green-800 hover:text-green-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(p)} className="text-sm text-amber-700 hover:text-amber-800">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : `Add Product — ${quarry.name}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Size" required>
            <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className={inputCls} required placeholder="e.g. 6mm, 10mm, 20mm" />
          </Field>
          <Field label={editing ? 'Price (use Price button to change)' : 'Price per tonne (₦)'} required={!editing}>
            <CurrencyInput value={form.currentPricePerTonne} onChange={val => setForm({ ...form, currentPricePerTonne: val })} className={inputCls} required={!editing} disabled={editing} />
          </Field>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>

      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title="Update Price">
        {priceModal && (
          <form onSubmit={handlePriceChange} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><span className="text-gray-500">Product:</span> <span className="font-medium">{quarry.name} — {priceModal.size}</span></p>
              <p><span className="text-gray-500">Current:</span> <span className="font-medium">{formatNaira(priceModal.currentPricePerTonne)}</span></p>
            </div>
            <Field label="New price (₦/tonne)" required>
              <CurrencyInput value={newPrice} onChange={setNewPrice} className={inputCls} required />
            </Field>
            <Field label="Reason">
              <input type="text" value={priceReason} onChange={e => setPriceReason(e.target.value)} className={inputCls} placeholder="optional" />
            </Field>
            <FormButtons onCancel={() => setPriceModal(null)} submitLabel="Update Price" />
          </form>
        )}
      </Modal>
    </div>
  );
}
