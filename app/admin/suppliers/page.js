'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, StatusPill, EmptyRow, Modal, FormButtons, Field, inputCls } from '@/components/ui';
import toast from 'react-hot-toast';

const blankForm = { name: '', type: 'quarry', address: '', phone: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const r = await fetch('/api/suppliers?type=quarry');
    const d = await r.json();
    if (d.success) setSuppliers(d.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, type: s.type, address: s.address || '', phone: s.phone || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editing ? `/api/suppliers/${editing._id}` : '/api/suppliers';
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    setSubmitting(false);
    if (d.success) {
      toast.success(editing ? 'Updated' : 'Created');
      setShowModal(false);
      load();
    } else {
      toast.error(d.error);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Deactivate ${s.name}?`)) return;
    const r = await fetch(`/api/suppliers/${s._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success('Deactivated'); load(); }
    else toast.error(d.error);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Quarry"
        subtitle="Quarries you buy aggregate products from"
        action={<button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Add Quarry</button>}
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Address</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {suppliers.length === 0 && <EmptyRow colSpan={4} text="No quarries added yet" />}
            {suppliers.map(s => (
              <tr key={s._id}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/suppliers/${s._id}`} className="hover:underline">{s.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.phone || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{s.address || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="text-sm text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                  <button onClick={() => handleDelete(s)} className="text-sm text-red-600 hover:text-red-800">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Quarry' : 'Add Quarry'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Phone">
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Address">
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </Field>
          <FormButtons onCancel={() => setShowModal(false)} submitting={submitting} />
        </form>
      </Modal>
    </div>
  );
}
