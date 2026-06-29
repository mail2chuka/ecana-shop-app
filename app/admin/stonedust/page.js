'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls } from '@/components/ui';
import { formatNaira } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = { quarry: '', size: '', currentPricePerTonne: '' };

export default function StoneDustPage() {
  const [products, setProducts] = useState([]);
  const [quarries, setQuarries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [priceModal, setPriceModal] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');

  const load = async () => {
    const [p, q] = await Promise.all([
      fetch('/api/stonedust').then(r => r.json()),
      fetch('/api/suppliers?type=quarry').then(r => r.json()),
    ]);
    if (p.success) setProducts(p.data);
    if (q.success) setQuarries(q.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blankForm); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ quarry: p.quarry, size: p.size, currentPricePerTonne: p.currentPricePerTonne });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editing ? `/api/stonedust/${editing._id}` : '/api/stonedust';
    const method = editing ? 'PUT' : 'POST';
    const body = { ...form, currentPricePerTonne: Number(form.currentPricePerTonne) };
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    setSubmitting(false);
    if (d.success) { toast.success(editing ? 'Updated' : 'Created'); setShowModal(false); load(); }
    else toast.error(d.error);
  };

  const handleDelete = async (p) => {
    if (!confirm(`Deactivate ${p.quarryName} ${p.size}?`)) return;
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

  return (
    <div>
      <PageHeader
        title="Stone Dust Products"
        subtitle="Quarry products defined by quarry + size + per-tonne price"
        action={
          quarries.length === 0
            ? <span className="text-sm text-gray-500">Add a quarry supplier first</span>
            : <button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Add Product</button>
        }
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Quarry</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Size</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Price / Tonne</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 && <EmptyRow colSpan={4} text="No stone dust products" />}
            {products.map(p => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-medium">{p.quarryName}</td>
                <td className="px-4 py-3">{p.size}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNaira(p.currentPricePerTonne)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setPriceModal(p); setNewPrice(p.currentPricePerTonne); }} className="text-sm text-blue-600 hover:text-blue-800 mr-3">Price</button>
                  <button onClick={() => openEdit(p)} className="text-sm text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(p)} className="text-sm text-red-600 hover:text-red-800">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Stone Dust' : 'Add Stone Dust'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Quarry" required>
            <select value={form.quarry} onChange={e => setForm({ ...form, quarry: e.target.value })} className={inputCls} required disabled={editing}>
              <option value="">— Select quarry —</option>
              {quarries.map(q => <option key={q._id} value={q._id}>{q.name}</option>)}
            </select>
          </Field>
          <Field label="Size" required>
            <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className={inputCls} required placeholder="e.g. 6mm, 10mm, 20mm" />
          </Field>
          <Field label={editing ? 'Price (use Price button to change)' : 'Price per tonne (₦)'} required={!editing}>
            <input type="number" step="0.01" value={form.currentPricePerTonne} onChange={e => setForm({ ...form, currentPricePerTonne: e.target.value })} className={inputCls} required={!editing} disabled={editing} />
          </Field>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>

      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title="Update Price">
        {priceModal && (
          <form onSubmit={handlePriceChange} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><span className="text-gray-500">Product:</span> <span className="font-medium">{priceModal.quarryName} — {priceModal.size}</span></p>
              <p><span className="text-gray-500">Current:</span> <span className="font-medium">{formatNaira(priceModal.currentPricePerTonne)}</span></p>
            </div>
            <Field label="New price (₦/tonne)" required>
              <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className={inputCls} required />
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
