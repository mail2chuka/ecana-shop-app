'use client';

import { useState, useEffect } from 'react';
import { formatNaira, formatDate } from '@/lib/format';

export default function SalesReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cementBrands, setCementBrands] = useState([]);
  const [stoneProducts, setStoneProducts] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('day');
  const [brandId, setBrandId] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    Promise.all([
      fetch('/api/cement-brands').then(r => r.json()),
      fetch('/api/stonedust').then(r => r.json()),
    ]).then(([b, p]) => {
      if (b.success) setCementBrands(b.data);
      if (p.success) setStoneProducts(p.data);
    });
  }, []);

  const fetchReport = async (overrideSortDir) => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate, groupBy, sortDir: overrideSortDir || sortDir });
    if (brandId) params.set('brandId', brandId);
    const res = await fetch(`/api/reports/sales?${params.toString()}`);
    const d = await res.json();
    if (d.success) setData(d.data);
    setLoading(false);
  };

  const toggleSort = () => {
    const next = sortDir === 'desc' ? 'asc' : 'desc';
    setSortDir(next);
    fetchReport(next);
  };

  useEffect(() => { fetchReport(); }, []);

  const cementTotal = data?.totals?.find(t => t._id === 'cement')?.total || 0;
  const stoneTotal = data?.totals?.find(t => t._id === 'stonedust')?.total || 0;
  const grandTotal = cementTotal + stoneTotal;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Sales Report</h1>

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
            <label className="block text-xs font-medium text-gray-500 mb-1">Group By</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Brand / Product</label>
            <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
              <option value="">All brands / products</option>
              {cementBrands.length > 0 && (
                <optgroup label="Cement Brands">
                  {cementBrands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </optgroup>
              )}
              {stoneProducts.length > 0 && (
                <optgroup label="Aggregate / Quarry Products">
                  {stoneProducts.map(p => <option key={p._id} value={p._id}>{p.quarryName} — {p.size}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={fetchReport} disabled={loading} className="px-6 py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-50">
            {loading ? 'Loading...' : 'Run Report'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500">Cement Sales</p>
              <p className="text-xl font-bold mt-1">{formatNaira(cementTotal)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500">Aggregate Sales</p>
              <p className="text-xl font-bold mt-1">{formatNaira(stoneTotal)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500">Grand Total</p>
              <p className="text-xl font-bold mt-1">{formatNaira(grandTotal)}</p>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={toggleSort}
                      className="flex items-center gap-1 font-medium hover:text-gray-900"
                    >
                      Period {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Transactions</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.grouped.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{row._id.period}</td>
                    <td className="px-4 py-2 capitalize">{row._id.saleType}</td>
                    <td className="px-4 py-2 text-right">{row.count}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatNaira(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.grouped.length === 0 && <p className="text-center py-8 text-gray-500">No sales in this period</p>}
          </div>
        </>
      )}
    </div>
  );
}
