'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatNaira, formatDate } from '@/lib/format';

export default function CustomerReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    let url = `/api/reports/customers?startDate=${startDate}&endDate=${endDate}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const d = await res.json();
    if (d.success) setRows(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Sales Per Customer</h1>
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, business, or phone..." className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} disabled={loading} className="w-full py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-50">
              {loading ? 'Loading...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Orders</th>
              <th className="px-4 py-2 text-right">Total Sales</th>
              <th className="px-4 py-2 text-right">Current Balance</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <p className="font-medium">{r.customerName}</p>
                  {r.businessName && <p className="text-xs text-gray-500">{r.businessName}</p>}
                </td>
                <td className="px-4 py-2 text-right">{r.count}</td>
                <td className="px-4 py-2 text-right font-medium">{formatNaira(r.total)}</td>
                <td className={`px-4 py-2 text-right ${r.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNaira(r.balance)}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/customers/${r.customerId}`} className="text-green-800 text-xs hover:underline">Statement</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="text-center py-8 text-gray-500">No data</p>}
      </div>
    </div>
  );
}
