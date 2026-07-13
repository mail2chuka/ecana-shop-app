'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/format';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');

  useEffect(() => {
    const q = entity ? `?entity=${entity}` : '';
    fetch(`/api/audit-log${q}`)
      .then(r => r.json())
      .then(d => { if (d.success) setLogs(d.data); })
      .finally(() => setLoading(false));
  }, [entity]);

  const entities = ['Sale', 'ATC', 'Customer', 'CustomerPayment', 'CementBrand', 'StoneDustProduct', 'Truck', 'Supplier'];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Audit Log</h1>
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setEntity('')}
            className={`px-3 py-1 rounded text-sm ${!entity ? 'bg-green-800 text-neutral-100' : 'border hover:bg-gray-50'}`}>All</button>
          {entities.map(e => (
            <button key={e} onClick={() => setEntity(e)}
              className={`px-3 py-1 rounded text-sm ${entity === e ? 'bg-green-800 text-neutral-100' : 'border hover:bg-gray-50'}`}>{e}</button>
          ))}
        </div>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-gray-800 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2">{log.userName || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.action === 'created' ? 'bg-green-100 text-green-700' :
                      log.action === 'updated' || log.action === 'price_change' ? 'bg-blue-100 text-blue-700' :
                      log.action === 'cancelled' || log.action === 'deactivated' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{log.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && logs.length === 0 && <p className="text-center py-8 text-gray-500">No logs found</p>}
      </div>
    </div>
  );
}
