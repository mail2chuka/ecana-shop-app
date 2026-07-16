'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatNaira, formatDate } from '@/lib/format';
import { btnPrimaryCls, tableActionCls, theadCls, tableScrollCls } from '@/components/ui';

export default function QuarryPurchasesReportPage() {
  const [rows, setRows] = useState([]);
  const [quarries, setQuarries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quarryId, setQuarryId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch('/api/suppliers?type=quarry').then(r => r.json()).then(d => { if (d.success) setQuarries(d.data); });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (quarryId) params.set('quarry', quarryId);
    const res = await fetch(`/api/quarry-purchases?${params.toString()}`);
    const d = await res.json();
    if (d.success) setRows(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalTonnage = rows.reduce((s, r) => s + r.tonnage, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Quarry Purchases</h1>
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Quarry</label>
            <select value={quarryId} onChange={e => setQuarryId(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
              <option value="">All quarries</option>
              {quarries.map(q => <option key={q._id} value={q._id}>{q.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} disabled={loading} className={`w-full ${btnPrimaryCls}`}>
              {loading ? 'Loading...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Tonnage Purchased</p>
          <p className="text-xl font-bold mt-1">{totalTonnage.toLocaleString()} t</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Cost</p>
          <p className="text-xl font-bold mt-1">{formatNaira(totalCost)}</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className={tableScrollCls}>
        <table className="w-full text-sm">
          <thead className={theadCls}>
            <tr>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Ref</th>
              <th className="px-4 py-2 text-left font-medium">Quarry</th>
              <th className="px-4 py-2 text-left font-medium">Product</th>
              <th className="px-4 py-2 text-left font-medium">Truck</th>
              <th className="px-4 py-2 text-right font-medium">Tonnage</th>
              <th className="px-4 py-2 text-right font-medium">Cost / Tonne</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.date)}</td>
                <td className="px-4 py-2 font-medium">
                  {r.sale
                    ? <Link href={`/admin/sales/${r.sale}`} className={`${tableActionCls} hover:underline`}>{r.referenceNumber}</Link>
                    : r.referenceNumber}
                </td>
                <td className="px-4 py-2">{r.quarryName}</td>
                <td className="px-4 py-2">{r.size}</td>
                <td className="px-4 py-2 text-gray-600">{r.truckPlate}</td>
                <td className="px-4 py-2 text-right">{r.tonnage}</td>
                <td className="px-4 py-2 text-right">{formatNaira(r.costPricePerTonne)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatNaira(r.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {!loading && rows.length === 0 && <p className="text-center py-8 text-gray-500">No purchases in this period</p>}
      </div>
    </div>
  );
}
