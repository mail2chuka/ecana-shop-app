'use client';

import { useState, useEffect } from 'react';
import { formatNaira } from '@/lib/format';

export default function TruckReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/trucks?startDate=${startDate}&endDate=${endDate}`);
    const d = await res.json();
    if (d.success) setRows(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Truck Utilization</h1>
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
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
              <th className="px-4 py-2 text-left">Truck</th>
              <th className="px-4 py-2 text-left">Driver</th>
              <th className="px-4 py-2 text-right">Trips</th>
              <th className="px-4 py-2 text-right">Total Revenue</th>
              <th className="px-4 py-2 text-right">Transport Fees</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{r.plateNumber}</td>
                <td className="px-4 py-2 text-gray-600">{r.driverName}</td>
                <td className="px-4 py-2 text-right">{r.trips}</td>
                <td className="px-4 py-2 text-right font-medium">{formatNaira(r.revenue)}</td>
                <td className="px-4 py-2 text-right">{formatNaira(r.transportFees)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="text-center py-8 text-gray-500">No truck data for this period</p>}
      </div>
    </div>
  );
}
