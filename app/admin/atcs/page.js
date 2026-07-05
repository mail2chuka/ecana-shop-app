'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, StatusPill } from '@/components/ui';
import { formatNumber, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const statusColor = {
  pending: 'gray',
  assigned: 'blue',
  collecting: 'yellow',
  arrived: 'green',
  closed: 'red',
};

const formatAtcNumber = (atc, brands) => {
  const brand = brands.find(b => b._id === atc.cementBrand);
  const abbr = brand?.abbreviation || '???';
  return `${abbr}-${atc.atcNumber}`;
};

const blankForm = { atcNumber: '', cementBrand: '', atcDate: new Date().toISOString().split('T')[0], bagsPaidFor: '', notes: '' };

export default function ATCsPage() {
  const [atcs, setATCs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const [assignModal, setAssignModal] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState('');

  const load = async () => {
    setLoading(true);
    const url = statusFilter ? `/api/atcs?status=${statusFilter}` : '/api/atcs';
    const [a, b, t] = await Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/cement-brands').then(r => r.json()),
      fetch('/api/trucks').then(r => r.json()),
    ]);
    if (a.success) setATCs(a.data);
    if (b.success) setBrands(b.data);
    if (t.success) setTrucks(t.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form, bagsPaidFor: Number(form.bagsPaidFor) };
      const r = await fetch('/api/atcs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success('ATC recorded'); setShowCreate(false); setForm(blankForm); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTruck) return toast.error('Pick a truck');
    const r = await fetch(`/api/atcs/${assignModal._id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ truckId: selectedTruck }),
    });
    const d = await r.json();
    if (d.success) { toast.success('Truck assigned'); setAssignModal(null); setSelectedTruck(''); load(); }
    else toast.error(d.error);
  };

  const markArrived = async (atc) => {
    if (!confirm(`Mark ATC ${formatAtcNumber(atc, brands)} as arrived?`)) return;
    const r = await fetch(`/api/atcs/${atc._id}/arrive`, { method: 'POST' });
    const d = await r.json();
    if (d.success) { toast.success('Marked arrived'); load(); }
    else toast.error(d.error);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="ATCs"
        subtitle="Authorization To Collect — cement stock tracking"
        action={
          brands.length === 0
            ? <span className="text-sm text-gray-500">Add a cement brand first</span>
            : <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Record ATC</button>
        }
      />

      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'pending', 'assigned', 'arrived', 'closed'].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-sm rounded border ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50'}`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ATC #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Brand</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Paid For</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Remaining</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Truck</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {atcs.length === 0 && <EmptyRow colSpan={8} text="No ATCs" />}
              {atcs.map(a => (
                <tr key={a._id}>
                  <td className="px-4 py-3 font-medium">{formatAtcNumber(a, brands)}</td>
                  <td className="px-4 py-3">{formatDate(a.atcDate)}</td>
                  <td className="px-4 py-3">{a.cementBrandName}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(a.bagsPaidFor)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNumber(a.bagsRemaining)}</td>
                  <td className="px-4 py-3 text-gray-500">{a.assignedTruckPlate || '-'}</td>
                  <td className="px-4 py-3"><StatusPill status={a.status} color={statusColor[a.status]} /></td>
                  <td className="px-4 py-3 text-right">
                    {!['arrived', 'closed'].includes(a.status) && (
                      <button onClick={() => setAssignModal(a)} className="text-sm text-blue-600 hover:text-blue-800 mr-3">
                        {a.assignedTruck ? 'Reassign' : 'Assign Truck'}
                      </button>
                    )}
                    {a.status === 'assigned' && (
                      <button onClick={() => markArrived(a)} className="text-sm text-green-600 hover:text-green-800">Arrived</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record ATC">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Cement Brand" required>
            <select value={form.cementBrand} onChange={e => setForm({ ...form, cementBrand: e.target.value })} className={inputCls} required>
              <option value="">— Select brand —</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name}{b.grade ? ` (${b.grade})` : ''}</option>)}
            </select>
          </Field>
          <Field label="ATC Number" required>
            <div className="space-y-2">
              <input type="text" value={form.atcNumber} onChange={e => setForm({ ...form, atcNumber: e.target.value })} className={inputCls} placeholder="e.g., 001, 0042, 1500" required />
              {form.cementBrand && form.atcNumber && (
                <p className="text-sm text-gray-600">
                  Final ATC: <span className="font-bold text-gray-900">{brands.find(b => b._id === form.cementBrand)?.abbreviation || 'N/A'}-{form.atcNumber}</span>
                </p>
              )}
              <p className="text-xs text-gray-500">Enter the number only. The brand abbreviation will be added automatically.</p>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ATC Date" required>
              <input type="date" value={form.atcDate} onChange={e => setForm({ ...form, atcDate: e.target.value })} className={inputCls} required />
            </Field>
            <Field label="Bags Paid For" required>
              <input type="number" value={form.bagsPaidFor} onChange={e => setForm({ ...form, bagsPaidFor: e.target.value })} className={inputCls} required min="1" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} rows="2" />
          </Field>
          <FormButtons onCancel={() => setShowCreate(false)} submitting={submitting} submitLabel="Record ATC" />
        </form>
      </Modal>

      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Truck">
        {assignModal && (
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><span className="text-gray-500">ATC:</span> <span className="font-medium">{formatAtcNumber(assignModal, brands)}</span></p>
              <p><span className="text-gray-500">Brand:</span> <span className="font-medium">{assignModal.cementBrandName}</span></p>
              <p><span className="text-gray-500">Bags:</span> <span className="font-medium">{formatNumber(assignModal.bagsRemaining)}</span></p>
            </div>
            <Field label="Truck" required>
              <select value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)} className={inputCls} required>
                <option value="">— Select truck —</option>
                {trucks.map(t => <option key={t._id} value={t._id}>{t.plateNumber} — {t.driverName}</option>)}
              </select>
            </Field>
            <FormButtons onCancel={() => setAssignModal(null)} submitLabel="Assign" />
          </form>
        )}
      </Modal>
    </div>
  );
}
