'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, StatusPill } from '@/components/ui';
import toast from 'react-hot-toast';

const blankForm = { plateNumber: '', driverName: '', driverPhone: '', type: 'cement', capacityTonnes: '', ownership: 'own' };

export default function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const r = await fetch('/api/trucks');
    const d = await r.json();
    if (d.success) setTrucks(d.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blankForm); setShowModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      plateNumber: t.plateNumber, driverName: t.driverName, driverPhone: t.driverPhone || '',
      type: t.type, capacityTonnes: t.capacityTonnes || '', ownership: t.ownership,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? `/api/trucks/${editing._id}` : '/api/trucks';
      const method = editing ? 'PUT' : 'POST';
      const body = { ...form, capacityTonnes: form.capacityTonnes ? Number(form.capacityTonnes) : null };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(editing ? 'Updated' : 'Created'); setShowModal(false); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Deactivate ${t.plateNumber}?`)) return;
    const r = await fetch(`/api/trucks/${t._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success('Deactivated'); load(); }
    else toast.error(d.error);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Trucks"
        subtitle="Trucks used for deliveries and ATC pickups"
        action={<button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Add Truck</button>}
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Plate</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Driver</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Capacity</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Ownership</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trucks.length === 0 && <EmptyRow colSpan={7} text="No trucks yet" />}
            {trucks.map(t => (
              <tr key={t._id}>
                <td className="px-4 py-3 font-medium">{t.plateNumber}</td>
                <td className="px-4 py-3">{t.driverName}</td>
                <td className="px-4 py-3 text-gray-500">{t.driverPhone || '-'}</td>
                <td className="px-4 py-3"><StatusPill status={t.type === 'cement' ? 'Cement (Bags)' : 'Stone (Tonnes)'} color={t.type === 'cement' ? 'blue' : 'amber'} /></td>
                <td className="px-4 py-3 text-right">{t.capacityTonnes ? `${t.capacityTonnes}t` : '-'}</td>
                <td className="px-4 py-3"><StatusPill status={t.ownership === 'own' ? 'Own' : 'Supplier'} color={t.ownership === 'own' ? 'green' : 'blue'} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className="text-sm text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(t)} className="text-sm text-red-600 hover:text-red-800">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Truck' : 'Add Truck'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Plate number" required>
            <input type="text" value={form.plateNumber} onChange={e => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} className={inputCls} required disabled={editing} />
          </Field>
          <Field label="Driver name" required>
            <input type="text" value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Driver phone">
            <input type="text" value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Truck type" required>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls} required disabled={editing}>
              <option value="cement">Cement (Bags)</option>
              <option value="stonedust">Aggregate (Tonnes)</option>
            </select>
          </Field>
          <Field label="Capacity (tonnes)">
            <input type="number" step="0.1" value={form.capacityTonnes} onChange={e => setForm({ ...form, capacityTonnes: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Ownership">
            <select value={form.ownership} onChange={e => setForm({ ...form, ownership: e.target.value })} className={inputCls}>
              <option value="own">Own</option>
              <option value="supplier">Supplier's truck</option>
            </select>
          </Field>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>
    </div>
  );
}
