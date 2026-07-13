'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader, PageHeader, Card, EmptyRow, StatusPill, inputCls } from '@/components/ui';
import { formatNaira, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const searchParams = useSearchParams();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: searchParams.get('type') || '',
    status: searchParams.get('status') || 'active',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.type) params.set('type', filter.type);
    if (filter.status) params.set('status', filter.status);
    if (filter.startDate) params.set('startDate', filter.startDate);
    if (filter.endDate) params.set('endDate', filter.endDate);
    const r = await fetch(`/api/sales?${params.toString()}`);
    const d = await r.json();
    if (d.success) setSales(d.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const deleteSale = async (sale) => {
    const reason = prompt(`Delete sale ${sale.saleNumber}? This permanently removes it and reverses balance/stock. Reason:`);
    if (!reason) return;
    const r = await fetch(`/api/sales/${sale._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const d = await r.json();
    if (d.success) { toast.success('Sale deleted, balance and stock reversed'); load(); }
    else toast.error(d.error);
  };

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="All sales transactions"
        action={
          <div className="flex gap-2">
            <Link href="/admin/sales/new/cement" className="px-3 py-2 bg-green-800 text-neutral-100 rounded text-sm hover:bg-green-900">New Cement Sale</Link>
            <Link href="/admin/sales/new/stonedust" className="px-3 py-2 bg-green-800 text-neutral-100 rounded text-sm hover:bg-green-900">New Aggregate Sale</Link>
          </div>
        }
      />

      <Card className="p-4 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })} className={inputCls}>
              <option value="">All types</option>
              <option value="cement">Cement</option>
              <option value="stonedust">Aggregate</option>
              <option value="shop">Shop</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className={inputCls}>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filter.startDate} onChange={e => setFilter({ ...filter, startDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filter.endDate} onChange={e => setFilter({ ...filter, endDate: e.target.value })} className={inputCls} />
          </div>
        </div>
      </Card>

      {loading ? <Loader /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sale #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Truck</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.length === 0 && <EmptyRow colSpan={8} text="No sales" />}
                {sales.map(s => (
                  <tr key={s._id}>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/sales/${s._id}`} className="text-green-800 hover:underline">{s.saleNumber}</Link>
                      {s.editedAt && (
                        <p className="text-xs text-amber-600 font-normal" title={formatDate(s.editedAt)}>Edited by {s.editedByName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(s.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${s.customer}`} className="hover:underline">{s.customerName}</Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{s.saleType}</td>
                    <td className="px-4 py-3 text-gray-500">{s.truckPlate || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNaira(s.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} color={s.status === 'active' ? 'green' : 'red'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/sales/${s._id}/invoice`} className="text-sm text-green-800 hover:text-green-900 mr-3">Invoice</Link>
                      {s.status === 'active' && (
                        <button onClick={() => deleteSale(s)} className="text-sm text-amber-700 hover:text-amber-800">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
