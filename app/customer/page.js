'use client';

import { useState, useEffect } from 'react';
import { formatNaira, formatDate, formatCustomerLabel } from '@/lib/format';
import { Loader, Card, theadCls, tableScrollCls } from '@/components/ui';
import toast from 'react-hot-toast';

export default function CustomerPortalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer-portal/statement')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else toast.error(d.error); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <p className="text-gray-500">Could not load your account</p>;

  const { customer, ledger } = data;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{formatCustomerLabel(customer)}</h1>
      <p className="text-sm text-gray-500 mb-6">{customer.phone}</p>

      <div className={`rounded-lg p-4 mb-6 ${customer.balance < 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <p className="text-sm text-gray-600">Current Balance</p>
        <p className={`text-3xl font-bold ${customer.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatNaira(customer.balance)}</p>
        {customer.balance < 0 && <p className="text-sm text-red-600 mt-1">You owe this amount</p>}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between">
          <h3 className="font-semibold text-sm">Account Statement</h3>
          <span className="text-xs text-gray-500">{ledger.length} entries</span>
        </div>
        <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Ref</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
                <th className="px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledger.map((entry, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-2">{entry.ref}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-2 text-right text-red-600">{entry.debit > 0 ? formatNaira(entry.debit) : '-'}</td>
                  <td className="px-4 py-2 text-right text-green-600">{entry.credit > 0 ? formatNaira(entry.credit) : '-'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${(entry.balance ?? 0) < 0 ? 'text-red-600' : ''}`}>
                    {entry.balance !== undefined ? formatNaira(entry.balance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ledger.length === 0 && <p className="text-center text-gray-500 py-8">No transactions yet</p>}
        </div>
      </Card>
    </div>
  );
}
