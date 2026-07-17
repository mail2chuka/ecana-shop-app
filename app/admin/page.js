'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card } from '@/components/ui';
import { formatNaira, formatNumber } from '@/lib/format';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!stats) return <p className="text-gray-500">Could not load dashboard</p>;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your business" />

      <div className="grid h hidden grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Today's Sales</p>
          <p className="text-xl font-bold mt-1">{formatNaira(stats.todaySales)}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.todayCount} transactions</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">This Month</p>
          <p className="text-xl font-bold mt-1">{formatNaira(stats.monthSales)}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.monthCount} transactions</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Owed</p>
          <p className="text-xl font-bold mt-1 text-red-600">{formatNaira(stats.totalOwed)}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.customersOwing} customers</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Available Cement</p>
          <p className="text-xl font-bold mt-1">{formatNumber(stats.availableBags)} bags</p>
          <p className="text-xs text-gray-500 mt-1">{stats.openATCs} open ATCs</p>
        </Card>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/sales/new/cement" className="block bg-rose-50 border border-rose-200 rounded-lg p-4 hover:bg-rose-100">
          <h3 className="font-bold text-rose-800">New Cement Sale</h3>
          <p className="text-sm text-gray-600 mt-1">Sell cement from an active ATC</p>
        </Link>
        <Link href="/admin/sales/new/stonedust" className="block bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100">
          <h3 className="font-bold text-amber-800">New Aggregate Sale</h3>
          <p className="text-sm text-gray-600 mt-1">Record a quarry product sale</p>
        </Link>
        <Link href="/admin/atcs" className="block bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100">
          <h3 className="font-bold text-green-800">Record ATC</h3>
          <p className="text-sm text-gray-600 mt-1">Add a new authorization to collect</p>
        </Link>
        <Link href="/admin/payments" className="block bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100">
          <h3 className="font-bold text-blue-800">Record Payment</h3>
          <p className="text-sm text-gray-600 mt-1">Top up a customer balance</p>
        </Link>
        <Link href="/admin/customers" className="block bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100">
          <h3 className="font-bold text-purple-800">Customers</h3>
          <p className="text-sm text-gray-600 mt-1">{stats.activeCustomers} active customers</p>
        </Link>
        <Link href="/admin/reports/sales" className="block bg-gray-100 border border-gray-300 rounded-lg p-4 hover:bg-gray-200">
          <h3 className="font-bold text-gray-800">Reports</h3>
          <p className="text-sm text-gray-600 mt-1">Sales, balances, and more</p>
        </Link>
      </div>
    </div>
  );
}
