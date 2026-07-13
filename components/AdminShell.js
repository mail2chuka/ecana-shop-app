'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiMenu, FiX, FiLogOut, FiArrowLeft, FiSearch } from 'react-icons/fi';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ links: [], users: [], products: [] });
  const searchBoxRef = useRef(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.replace('/');
    else if (session.user.role !== 'admin') router.replace('/');
  }, [session, status, router]);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event) => {
      if (!searchBoxRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const r = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const d = await r.json();
        if (d.success) {
          setSearchResults(d.data || { links: [], users: [], products: [] });
        }
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

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
      className={`block px-3 py-2 rounded-md border text-sm leading-snug whitespace-normal break-words transition-colors ${
        pathname === item.href
          ? 'bg-rose-800/90 text-white border-rose-500/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
          : 'bg-rose-950/45 text-rose-100 border-rose-900/70 hover:bg-rose-900/70 hover:text-white'
      }`}
    >
      {item.label}
    </Link>
  );

  const renderSearchGroup = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="py-1">
        <p className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-500">{title}</p>
        {items.map((item) => (
          <Link
            key={`${title}-${item.id || item.href}`}
            href={item.href}
            onClick={() => setSearchOpen(false)}
            className="block px-3 py-2 hover:bg-gray-50"
          >
            <p className="text-sm font-medium text-gray-900 truncate">{item.title || item.label}</p>
            {item.subtitle && <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gradient-to-b from-emerald-950 via-emerald-900 to-rose-950 transform transition-transform lg:translate-x-0 lg:static flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between min-h-14 px-4 border-b border-emerald-800/60 bg-black/10 shrink-0">
          <span className="font-bold tracking-wide text-emerald-100">GSM</span>
          <button className="lg:hidden text-emerald-200/80 hover:text-white" onClick={() => setOpen(false)}>
            <FiX size={20} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
          {menu.map((entry, i) => {
            if (entry.group) {
              return (
                <div key={entry.group} className="pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/95 px-2 mb-2 whitespace-normal break-words">{entry.group}</p>
                  {entry.items.map(renderItem)}
                </div>
              );
            }
            return renderItem(entry);
          })}
        </nav>

        <div className="shrink-0 p-3 border-t border-emerald-800/60 bg-black/15">
          <div className="mb-2 px-3">
            <p className="text-sm text-emerald-50 font-medium break-words" title={session.user.name}>{session.user.name}</p>
            <p className="text-xs text-emerald-300/70 capitalize">{session.user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center w-full px-3 py-2 text-sm text-white bg-green-800 border border-green-950 hover:bg-green-900 rounded-md"
          >
            <FiLogOut className="mr-2 shrink-0" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-14 bg-white border-b flex items-center px-4 lg:hidden no-print">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-gray-600 shrink-0">
            <FiMenu size={20} />
          </button>
          <span className="ml-2 font-semibold text-sm truncate">
            <span className="sm:hidden">GSM</span>
            <span className="hidden sm:inline">GSM - Goods Sales and Management</span>
          </span>
        </header>
        <div className="h-12 bg-white border-b flex items-center px-4 lg:px-6 gap-3 no-print">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft size={16} /> Back
          </button>

          <div ref={searchBoxRef} className="relative flex-1 max-w-2xl ml-auto">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search links, users, customers, products..."
                className="w-full h-9 rounded border border-gray-300 pl-9 pr-3 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>

            {searchOpen && (
              <div className="absolute z-40 mt-2 w-full rounded-lg border bg-white shadow-lg max-h-[70vh] overflow-y-auto">
                {searchLoading ? (
                  <p className="px-3 py-3 text-sm text-gray-500">Searching...</p>
                ) : (
                  <>
                    {renderSearchGroup('Links', searchResults.links)}
                    {renderSearchGroup('Users & Customers', searchResults.users)}
                    {renderSearchGroup('Products', searchResults.products)}
                    {(searchResults.links?.length || 0) + (searchResults.users?.length || 0) + (searchResults.products?.length || 0) === 0 && (
                      <p className="px-3 py-3 text-sm text-gray-500">No results found</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <main className="admin-main flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
