'use client';

import { useState, useEffect } from 'react';
import { formatNaira } from '@/lib/format';

export default function ProductReportPage() {
  const [rows, setRows] = useState([]);
  const [cementBrands, setCementBrands] = useState([]);
  const [stoneProducts, setStoneProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [brandId, setBrandId] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/cement-brands').then(r => r.json()),
      fetch('/api/stonedust').then(r => r.json()),
    ]).then(([b, p]) => {
      if (b.success) setCementBrands(b.data);
      if (p.success) setStoneProducts(p.data);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (brandId) params.set('brandId', brandId);
    const res = await fetch(`/api/reports/products?${params.toString()}`);
    const d = await res.json();
    if (d.success) setRows(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const cement = rows.filter(r => r.itemType === 'cement');
  const stone = rows.filter(r => r.itemType === 'stonedust');

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Sales Per Product</h1>
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
          <div className="flex items-end">
            <button onClick={fetchData} disabled={loading} className="w-full py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-50">
              {loading ? 'Loading...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      {cement.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold text-sm">Cement Brands</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Brand</th>
                <th className="px-4 py-2 text-right">Bags Sold (Bill)</th>
                <th className="px-4 py-2 text-right">Bags Loaded (Actual)</th>
                <th className="px-4 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cement.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-right">{r.billQty?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{r.actualQty?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatNaira(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stone.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold text-sm">Aggregate / Quarry Products</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Quarry</th>
                <th className="px-4 py-2 text-left">Size</th>
                <th className="px-4 py-2 text-right">Tonnes Sold (Bill)</th>
                <th className="px-4 py-2 text-right">Tonnes Loaded (Actual)</th>
                <th className="px-4 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stone.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium">{r.quarryName}</td>
                  <td className="px-4 py-2">{r.size}</td>
                  <td className="px-4 py-2 text-right">{r.billQty?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{r.actualQty?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatNaira(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">No sales data for this period</div>
      )}
    </div>
  );
}
