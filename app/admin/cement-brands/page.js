'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls } from '@/components/ui';
import { formatNaira } from '@/lib/format';
import toast from 'react-hot-toast';

const blankForm = { name: '', abbreviation: '', grade: '', bagSize: 50, currentPricePerBag: '', depot: '' };

export default function CementBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const [priceModal, setPriceModal] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');

  const load = async () => {
    const b = await fetch('/api/cement-brands').then(r => r.json());
    if (b.success) setBrands(b.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name, abbreviation: b.abbreviation || '', grade: b.grade || '', bagSize: b.bagSize,
      currentPricePerBag: b.currentPricePerBag, depot: b.depotName || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editing ? `/api/cement-brands/${editing._id}` : '/api/cement-brands';
    const method = editing ? 'PUT' : 'POST';
    const body = { ...form, currentPricePerBag: Number(form.currentPricePerBag), bagSize: Number(form.bagSize) };
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    setSubmitting(false);
    if (d.success) {
      toast.success(editing ? 'Updated' : 'Created');
      setShowModal(false);
      load();
    } else toast.error(d.error);
  };

  const handleDelete = async (b) => {
    if (!confirm(`Deactivate ${b.name}?`)) return;
    const r = await fetch(`/api/cement-brands/${b._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success('Deactivated'); load(); }
    else toast.error(d.error);
  };

  const handlePriceChange = async (e) => {
    e.preventDefault();
    if (!newPrice || newPrice <= 0) return toast.error('Enter a valid price');
    const r = await fetch(`/api/cement-brands/${priceModal._id}/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPrice: Number(newPrice), reason: priceReason }),
    });
    const d = await r.json();
    if (d.success) {
      toast.success('Price updated');
      setPriceModal(null);
      setNewPrice('');
      setPriceReason('');
      load();
    } else toast.error(d.error);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Cement Brands"
        subtitle="Brands you sell with their current per-bag price"
        action={<button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Add Brand</button>}
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Brand</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Abbr</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Grade</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Depot</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Bag Size</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Current Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {brands.length === 0 && <EmptyRow colSpan={7} text="No cement brands yet" />}
            {brands.map(b => (
              <tr key={b._id}>
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 font-mono font-bold text-gray-900">{b.abbreviation || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{b.grade || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{b.depotName || '-'}</td>
                <td className="px-4 py-3 text-right">{b.bagSize}kg</td>
                <td className="px-4 py-3 text-right font-medium">{formatNaira(b.currentPricePerBag)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setPriceModal(b); setNewPrice(b.currentPricePerBag); }} className="text-sm text-blue-600 hover:text-blue-800 mr-3">Price</button>
                  <button onClick={() => openEdit(b)} className="text-sm text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(b)} className="text-sm text-red-600 hover:text-red-800">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Brand' : 'Add Brand'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Brand name" required>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} required placeholder="e.g. Dangote" />
          </Field>
          <Field label="Abbreviation (3 letters max)" required>
            <input type="text" value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value.toUpperCase().slice(0, 3) })} className={inputCls} required placeholder="e.g. DAN, BUA, MGX" maxLength="3" />
            <p className="text-xs text-gray-500 mt-1">Used in ATC numbers (e.g., DAN-001)</p>
          </Field>
          <Field label="Grade">
            <input type="text" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} className={inputCls} placeholder="e.g. 42.5N" />
          </Field>
          <Field label="Depot (optional)">
            <input type="text" value={form.depot} onChange={e => setForm({ ...form, depot: e.target.value })} className={inputCls} placeholder="e.g. Central Warehouse, Port Depot" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bag size (kg)">
              <input type="number" value={form.bagSize} onChange={e => setForm({ ...form, bagSize: e.target.value })} className={inputCls} />
            </Field>
            <Field label={editing ? 'Price (use Price button to change)' : 'Price per bag (₦)'} required={!editing}>
              <input type="number" step="0.01" value={form.currentPricePerBag} onChange={e => setForm({ ...form, currentPricePerBag: e.target.value })} className={inputCls} required={!editing} disabled={editing} />
            </Field>
          </div>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>

      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title="Update Price">
        {priceModal && (
          <form onSubmit={handlePriceChange} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><span className="text-gray-500">Brand:</span> <span className="font-medium">{priceModal.name}</span></p>
              <p><span className="text-gray-500">Current price:</span> <span className="font-medium">{formatNaira(priceModal.currentPricePerBag)}</span></p>
            </div>
            <Field label="New price (₦)" required>
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
