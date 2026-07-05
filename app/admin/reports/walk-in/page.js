'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatNaira, formatDate } from '@/lib/format';

export default function WalkInReportPage() {
  const [rows, setRows] = useState([]);
  const [cementBrands, setCementBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [brandId, setBrandId] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    fetch('/api/cement-brands').then(r => r.json()).then(b => { if (b.success) setCementBrands(b.data); });
  }, []);

  const fetchData = async (overrideSortDir) => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate, sortDir: overrideSortDir || sortDir });
    if (brandId) params.set('brandId', brandId);
    const res = await fetch(`/api/reports/walk-in?${params.toString()}`);
    const d = await res.json();
    if (d.success) setRows(d.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSort = () => {
    const next = sortDir === 'desc' ? 'asc' : 'desc';
    setSortDir(next);
    fetchData(next);
  };

  const totalSales = rows.reduce((s, r) => s + r.total, 0);
  const totalBags = rows.reduce((s, r) => s + r.bagsSold, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Walk-in Sales Report</h1>

      {/* Filters */}
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
            <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
              <option value="">All brands</option>
              {cementBrands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => fetchData()} disabled={loading} className="w-full py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-50">
              {loading ? 'Loading...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500 font-medium">Total Sales</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{rows.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500 font-medium">Total Bags Sold</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{totalBags}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500 font-medium">Total Amount</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{formatNaira(totalSales)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left">
                <button onClick={toggleSort} className="flex items-center gap-1 font-medium hover:text-gray-900">
                  Date {sortDir === 'desc' ? '↓' : '↑'}
                </button>
              </th>
              <th className="px-4 py-2 text-left">ATC</th>
              <th className="px-4 py-2 text-left">Brand</th>
              <th className="px-4 py-2 text-right">Bags</th>
              <th className="px-4 py-2 text-right">Price/Bag</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">No walk-in sales found</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(r.date)}</td>
                  <td className="px-4 py-2 font-medium">{r.atcNumber}</td>
                  <td className="px-4 py-2">{r.cementBrandName}</td>
                  <td className="px-4 py-2 text-right">{r.bagsSold}</td>
                  <td className="px-4 py-2 text-right">{formatNaira(r.pricePerBag)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatNaira(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
