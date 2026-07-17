'use client';

import { useState, useEffect } from 'react';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, StatusPill, btnPrimaryCls, tableActionCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatNumber, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const statusColor = {
  pending: 'blue',
  assigned: 'yellow',
  loaded: 'green',
  arrived: 'green',
  closed: 'gray',
};

const statusSortOrder = {
  arrived: 0,
  loaded: 1,
  assigned: 2,
  pending: 3,
  closed: 4,
};

const formatAtcNumber = (atc, brands) => {
  const brand = brands.find(b => b._id === atc.cementBrand);
  const abbr = brand?.abbreviation || '???';
  return `${abbr}-${atc.atcNumber}`;
};

const formatQtyRatio = (remaining, total) => `${remaining}/${total}`;

const loadingOptions = [
  { value: 'just_loaded', label: 'Just Loaded' },
  { value: 'one_hour_ago', label: 'One Hour ago' },
  { value: 'two_hours_ago', label: 'Two Hours ago' },
  { value: 'three_hours_ago', label: 'Three Hours ago' },
  { value: 'four_hours_ago', label: 'Four Hours ago' },
  { value: 'five_hours_ago', label: 'Five Hours ago' },
];

const getStatusLabel = (atc) => atc.status[0].toUpperCase() + atc.status.slice(1);

const formatHoursAgo = (since, nowMs) => {
  if (!since) return null;
  const hours = Math.floor((nowMs - new Date(since).getTime()) / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return `${hours <= 0 ? '<1' : hours} hour${hours === 1 ? '' : 's'} ago`;
};

const blankForm = { atcNumber: '', cementBrand: '', atcDate: new Date().toISOString().split('T')[0], bagsPaidFor: '', notes: '' };

export default function ATCsPage() {
  const [allAtcs, setAllAtcs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const [assignModal, setAssignModal] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [loadingModal, setLoadingModal] = useState(null);
  const [loadingChoice, setLoadingChoice] = useState('just_loaded');
  const [nowMs, setNowMs] = useState(Date.now());

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const url = brandFilter ? `/api/atcs?brand=${brandFilter}` : '/api/atcs';
    const [a, b, t] = await Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/cement-brands').then(r => r.json()),
      fetch('/api/trucks').then(r => r.json()),
    ]);
    if (a.success) setAllAtcs(a.data);
    if (b.success) setBrands(b.data);
    if (t.success) setTrucks(t.data);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      setNowMs(Date.now());
      load(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [brandFilter]);

  const atcs = (statusFilter ? allAtcs.filter(a => a.status === statusFilter) : allAtcs)
    .slice()
    .sort((x, y) => {
      const diff = (statusSortOrder[x.status] ?? 5) - (statusSortOrder[y.status] ?? 5);
      if (diff !== 0) return diff;
      return new Date(x.atcDate).getTime() - new Date(y.atcDate).getTime();
    });
  const statusCounts = allAtcs.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

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

  const handleLoading = async (e) => {
    e.preventDefault();
    if (!loadingModal) return;
    const r = await fetch(`/api/atcs/${loadingModal._id}/loading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: loadingChoice }),
    });
    const d = await r.json();
    if (d.success) {
      toast.success('Loading updated');
      setLoadingModal(null);
      setLoadingChoice('just_loaded');
      load();
    } else {
      toast.error(d.error);
    }
  };

  const handleArrive = async (atc) => {
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
            : <button onClick={() => setShowCreate(true)} className={btnPrimaryCls}>Record ATC</button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="px-3 py-1.5 border rounded text-sm">
          <option value="">All Brands</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}{b.grade ? ` (${b.grade})` : ''}</option>)}
        </select>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'pending', 'assigned', 'loaded', 'arrived', 'closed'].map(s => {
          const count = s ? (statusCounts[s] || 0) : allAtcs.length;
          return (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-sm rounded border ${statusFilter === s ? 'bg-green-800 text-neutral-100 border-green-800' : 'bg-white hover:bg-gray-50'}`}
            >
              {s ? s[0].toUpperCase() + s.slice(1) : 'All'} ({count})
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className={tableScrollCls}>
          <table className="w-full text-sm min-w-[980px]">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">ATC #</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-3 py-3 text-left font-medium">Assigned Date</th>
                <th className="px-3 py-3 text-left font-medium">Delivery Date</th>
                <th className="px-4 py-3 text-right font-medium">Remaining</th>
                <th className="px-3 py-3 text-left font-medium">Qty Supplied</th>
                <th className="px-3 py-3 text-left font-medium">Ref</th>
                <th className="px-3 py-3 text-left font-medium">Truck</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {atcs.length === 0 && <EmptyRow colSpan={10} text="No ATCs" />}
              {atcs.map(a => {
                const supplies = a.supplies || [];
                const deliveryDate = a.deliveryDate || a.arrivalDate;

                return (
                  <tr key={a._id}>
                    <td className="px-4 py-3 font-medium">{formatAtcNumber(a, brands)}</td>
                    <td className="px-4 py-3">{formatDate(a.atcDate)}</td>
                    <td className="px-3 py-3">{a.assignedDate ? formatDate(a.assignedDate) : '-'}</td>
                    <td className="px-3 py-3">{deliveryDate ? formatDate(deliveryDate) : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatQtyRatio(formatNumber(a.bagsRemaining), formatNumber(a.bagsPaidFor))}</td>
                    <td className="px-3 py-3 align-top">
                      {supplies.length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {supplies.map((s, idx) => (
                            <div key={`${a._id}-qty-${idx}`} className="whitespace-nowrap">
                              {formatNumber(s.qtySupplied)}
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {supplies.length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {supplies.map((s, idx) => (
                            <div key={`${a._id}-ref-${idx}`} className="whitespace-nowrap font-medium text-gray-700">
                              {s.reference}
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-500">{a.assignedTruckPlate || '-'}</td>
                    <td className="px-3 py-3">
                      <StatusPill status={getStatusLabel(a)} color={statusColor[a.status]} />
                      {a.status === 'loaded' && a.loadedAt && (
                        <div className="mt-1 text-xs text-gray-500">{formatHoursAgo(a.loadedAt, nowMs)}</div>
                      )}
                      {a.status === 'arrived' && a.arrivalDate && (
                        <div className="mt-1 text-xs text-gray-500">{formatHoursAgo(a.arrivalDate, nowMs)}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {(a.status === 'pending' && !a.assignedTruck) && (
                        <button onClick={() => setAssignModal(a)} className={`${tableActionCls} mr-3`}>
                          Assign Truck
                        </button>
                      )}
                      {a.status === 'assigned' && a.assignedTruck && (
                        <>
                          <button onClick={() => setAssignModal(a)} className={`${tableActionCls} mr-3`}>
                            Reassign
                          </button>
                          <button onClick={() => { setLoadingModal(a); setLoadingChoice('just_loaded'); }} className={`${tableActionCls} mr-3`}>
                            Loading
                          </button>
                        </>
                      )}
                      {a.status === 'loaded' && (
                        <button onClick={() => handleArrive(a)} className={`${tableActionCls} mr-3`}>
                          Mark Arrived
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
            <Field label="Quantity in Bags" required>
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
                {trucks.filter(t => t.type === 'cement').map(t => {
                  const busyOn = allAtcs.find(a => a._id !== assignModal._id && a.assignedTruck === t._id && a.status !== 'closed');
                  const busy = busyOn || t.busy;
                  return (
                    <option key={t._id} value={t._id} disabled={!!busy}>
                      {t.plateNumber} — {t.driverName}{busyOn ? ` (busy on ${formatAtcNumber(busyOn, brands)})` : t.busy ? ` (${t.busyReason})` : ''}
                    </option>
                  );
                })}
              </select>
            </Field>
            <FormButtons onCancel={() => setAssignModal(null)} submitLabel="Assign" />
          </form>
        )}
      </Modal>

      <Modal open={!!loadingModal} onClose={() => setLoadingModal(null)} title="Loading" size="lg">
        {loadingModal && (
          <form onSubmit={handleLoading} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><span className="text-gray-500">ATC:</span> <span className="font-medium">{formatAtcNumber(loadingModal, brands)}</span></p>
              <p><span className="text-gray-500">Truck:</span> <span className="font-medium">{loadingModal.assignedTruckPlate || '-'}</span></p>
              <p><span className="text-gray-500">Remaining:</span> <span className="font-medium">{formatQtyRatio(formatNumber(loadingModal.bagsRemaining), formatNumber(loadingModal.bagsPaidFor))}</span></p>
            </div>
            <Field label="Loading Status" required>
              <select value={loadingChoice} onChange={e => setLoadingChoice(e.target.value)} className={inputCls} required>
                {loadingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <FormButtons onCancel={() => setLoadingModal(null)} submitLabel="Save Loading" />
          </form>
        )}
      </Modal>
    </div>
  );
}
