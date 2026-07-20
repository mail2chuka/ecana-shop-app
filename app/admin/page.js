'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader, PageHeader, Card } from '@/components/ui';
import { formatNaira, formatNumber } from '@/lib/format';
import toast from 'react-hot-toast';

// Mirrors the `allow` lists on the matching sidebar links in components/AdminShell.js — a shortcut
// here is pointless (and confusing) for a role that gets bounced back the moment they click it.
const QUICK_ACTIONS = [
  {
    href: '/admin/sales/new/cement', allow: ['admin', 'gsm_manager'],
    cls: 'block bg-rose-50 border border-rose-200 rounded-lg p-4 hover:bg-rose-100', titleCls: 'font-bold text-rose-800',
    title: 'New Cement Sale', subtitle: 'Sell cement from an active ATC',
  },
  {
    href: '/admin/sales/new/stonedust', allow: ['admin', 'gsm_manager'],
    cls: 'block bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100', titleCls: 'font-bold text-amber-800',
    title: 'New Aggregate Sale', subtitle: 'Record a quarry product sale',
  },
  {
    href: '/admin/atcs', allow: ['admin', 'atc_manager'],
    cls: 'block bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100', titleCls: 'font-bold text-green-800',
    title: 'Record ATC', subtitle: 'Add a new authorization to collect',
  },
  {
    href: '/admin/payments', allow: ['admin', 'gsm_manager'],
    cls: 'block bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100', titleCls: 'font-bold text-blue-800',
    title: 'Record Payment', subtitle: 'Top up a customer balance',
  },
  {
    href: '/admin/customers', allow: ['admin', 'gsm_manager'],
    cls: 'block bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100', titleCls: 'font-bold text-purple-800',
    title: 'Customers', subtitle: null,
  },
  {
    href: '/admin/reports/sales', allow: ['admin', 'gsm_manager', 'auditor'],
    cls: 'block bg-gray-100 border border-gray-300 rounded-lg p-4 hover:bg-gray-200', titleCls: 'font-bold text-gray-800',
    title: 'Reports', subtitle: 'Sales, balances, and more',
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
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
        {QUICK_ACTIONS.filter((a) => a.allow.includes(session?.user?.role)).map((a) => (
          <Link key={a.href} href={a.href} className={a.cls}>
            <h3 className={a.titleCls}>{a.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {a.href === '/admin/customers' ? `${stats.activeCustomers} active customers` : a.subtitle}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
