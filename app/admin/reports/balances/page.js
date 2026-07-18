'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatNaira } from '@/lib/format';
import { tableActionCls, theadCls, tableScrollCls } from '@/components/ui';

const formatMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function BalancesReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/balances?filter=${filter}`);
    const d = await res.json();
    if (d.success) setData(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Customer Balances</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Owed to You</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatNaira(data?.totals?.totalOwed || 0)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Customer Credit</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatNaira(data?.totals?.totalCredit || 0)}</p>
        </div>
        <div className={`rounded-lg p-4 border ${(data?.totals?.net || 0) < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-gray-500">Net (Credit − Owed)</p>
          <p className={`text-xl font-bold mt-1 ${(data?.totals?.net || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatNaira(data?.totals?.net || 0)}
          </p>
        </div>
      </div>

      {(data?.monthly?.length || 0) > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Monthly Summary</h2>
            <p className="text-xs text-gray-500 mt-0.5">New debt incurred vs. payments received each month — not a running balance.</p>
          </div>
          <div className={tableScrollCls}>
            <table className="w-full text-sm">
              <thead className={theadCls}>
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Month</th>
                  <th className="px-4 py-2 text-right font-medium">Debt Added</th>
                  <th className="px-4 py-2 text-right font-medium">Surplus Added</th>
                  <th className="px-4 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.monthly.map(m => (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatNaira(m.debtAdded)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatNaira(m.surplusAdded)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${m.net < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatNaira(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex gap-2">
          {['all', 'negative', 'positive'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-green-800 text-neutral-100' : 'border hover:bg-gray-50'}`}>
              {f === 'all' ? 'All' : f === 'negative' ? 'Owing' : 'In Credit'}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-gray-800 border-t-transparent rounded-full" /></div>
        ) : (
          <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-2 text-left font-medium">Customer</th>
                <th className="px-4 py-2 text-left font-medium">Phone</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 text-right font-medium">Credit Limit</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.customers || []).map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <p className="font-medium">{c.name}</p>
                    {c.businessName && <p className="text-xs text-gray-500">{c.businessName}</p>}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{c.phone}</td>
                  <td className={`px-4 py-2 text-right font-medium ${c.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNaira(c.balance)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {c.creditLimit ? formatNaira(c.creditLimit) : 'No limit'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/admin/customers/${c._id}`} className={`${tableActionCls} text-xs hover:underline`}>Statement</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {!loading && data?.customers?.length === 0 && <p className="text-center py-8 text-gray-500">No customers found</p>}
      </div>
    </div>
  );
}
