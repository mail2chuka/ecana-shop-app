'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, StatusPill, btnPrimaryCls, tableActionCls, tableDangerActionCls, theadCls, tableScrollCls } from '@/components/ui';
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
    if (t.busy) { toast.error(`Can't edit ${t.plateNumber} — ${t.busyReason}`); return; }
    setEditing(t);
    setForm({
      plateNumber: t.plateNumber, driverName: t.driverName, driverPhone: t.driverPhone || '',
      type: t.type || '', capacityTonnes: t.capacityTonnes || '', ownership: t.ownership,
    });
    setShowModal(true);
  };

  const trucksNeedingType = trucks.filter(t => t.type !== 'cement' && t.type !== 'stonedust');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing && form.type !== editing.type) {
      const from = editing.type === 'cement' ? 'cement' : 'aggregates';
      const to = form.type === 'cement' ? 'cement' : 'aggregates';
      if (!confirm(`${editing.plateNumber} is currently registered to carry ${from}. Switch it to carry ${to} instead?`)) return;
    }
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
        action={<button onClick={openCreate} className={btnPrimaryCls}>Add Truck</button>}
      />

      {trucksNeedingType.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">
            {trucksNeedingType.length} truck{trucksNeedingType.length === 1 ? '' : 's'} {trucksNeedingType.length === 1 ? "doesn't" : "don't"} have a product type set — cement and aggregate trucks must be kept separate. Click to fix:
          </p>
          <div className="flex flex-wrap gap-2">
            {trucksNeedingType.map(t => (
              <button
                key={t._id}
                onClick={() => openEdit(t)}
                className="px-3 py-1 bg-amber-100 border border-amber-300 rounded text-sm text-amber-800 hover:bg-amber-200"
              >
                {t.plateNumber} — {t.driverName}
              </button>
            ))}
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className={tableScrollCls}>
        <table className="w-full text-sm">
          <thead className={theadCls}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">Plate</th>
              <th className="px-4 py-3 text-left font-medium">Driver</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Capacity</th>
              <th className="px-4 py-3 text-left font-medium">Ownership</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trucks.length === 0 && <EmptyRow colSpan={8} text="No trucks yet" />}
            {trucks.map(t => (
              <tr key={t._id}>
                <td className="px-4 py-3 font-medium">{t.plateNumber}</td>
                <td className="px-4 py-3">{t.driverName}</td>
                <td className="px-4 py-3 text-gray-500">{t.driverPhone || '-'}</td>
                <td className="px-4 py-3">
                  {t.type === 'cement'
                    ? <StatusPill status="Cement (Bags)" color="blue" />
                    : t.type === 'stonedust'
                      ? <StatusPill status="Stone (Tonnes)" color="amber" />
                      : <StatusPill status="Type not set" color="gray" />}
                </td>
                <td className="px-4 py-3 text-right">{t.capacityTonnes ? `${t.capacityTonnes}t` : '-'}</td>
                <td className="px-4 py-3"><StatusPill status={t.ownership === 'own' ? 'Own' : 'Supplier'} color={t.ownership === 'own' ? 'green' : 'blue'} /></td>
                <td className="px-4 py-3">
                  {t.busy ? <StatusPill status={t.busyReason} color="amber" /> : <span className="text-gray-400 text-xs">Free</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className={`${tableActionCls} mr-3 ${t.busy ? 'opacity-40 cursor-not-allowed' : ''}`}>Edit</button>
                  <button onClick={() => handleDelete(t)} className={tableDangerActionCls}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls} required>
              <option value="" disabled>— Select type —</option>
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
