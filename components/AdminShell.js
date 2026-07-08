'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiMenu, FiX, FiLogOut, FiChevronDown, FiArrowLeft } from 'react-icons/fi';

const menu = [
  { label: 'Dashboard', href: '/admin' },
  {
    group: 'Setup',
    items: [
      { label: 'Quarry', href: '/admin/suppliers' },
      { label: 'Cement Brands', href: '/admin/cement-brands' },
      { label: 'Aggregate', href: '/admin/stonedust' },
      { label: 'Trucks', href: '/admin/trucks' },
      { label: 'Customers', href: '/admin/customers' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'ATCs', href: '/admin/atcs' },
      { label: 'Sales', href: '/admin/sales' },
      { label: 'New Cement Sale', href: '/admin/sales/new/cement' },
      { label: 'New Aggregate Sale', href: '/admin/sales/new/stonedust' },
      { label: 'Shop', href: '/admin/shop' },
      { label: 'Customer Payments', href: '/admin/payments' },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Sales Report', href: '/admin/reports/sales' },
      { label: 'Customer Balances', href: '/admin/reports/balances' },
      { label: 'Per Customer', href: '/admin/reports/customers' },
      { label: 'Per Product', href: '/admin/reports/products' },
      { label: 'Truck Utilization', href: '/admin/reports/trucks' },
    ],
  },
  { label: 'Audit Log', href: '/admin/audit-log' },
];

export default function AdminShell({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.replace('/');
    else if (session.user.role !== 'admin') router.replace('/');
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  if (session.user.role !== 'admin') return null;

  const renderItem = (item) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      className={`block px-3 py-2 rounded text-sm ${
        pathname === item.href
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {item.label}
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 transform transition-transform lg:translate-x-0 lg:static overflow-y-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-800">
          <span className="font-bold text-white">GSM</span>
          <button className="lg:hidden text-gray-400" onClick={() => setOpen(false)}>
            <FiX size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 pb-32">
          {menu.map((entry, i) => {
            if (entry.group) {
              return (
                <div key={entry.group} className="pt-3">
                  <p className="text-xs font-semibold uppercase text-gray-500 px-3 mb-1">{entry.group}</p>
                  {entry.items.map(renderItem)}
                </div>
              );
            }
            return renderItem(entry);
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800 bg-gray-900">
          <div className="mb-2 px-3">
            <p className="text-sm text-white font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{session.user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded"
          >
            <FiLogOut className="mr-2" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center px-4 lg:hidden no-print">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-gray-600">
            <FiMenu size={20} />
          </button>
          <span className="ml-2 font-semibold text-sm">GSM - Goods Sales and Management</span>
        </header>
        <div className="h-12 bg-white border-b flex items-center px-4 lg:px-6 no-print">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft size={16} /> Back
          </button>
        </div>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
