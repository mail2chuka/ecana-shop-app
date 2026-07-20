'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/ui';
import { FiLogOut } from 'react-icons/fi';

export default function PlatformLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.replace('/');
    else if (!(session.user.role === 'super_admin')) router.replace('/');
  }, [session, status, router]);

  if (status === 'loading' || !session || !(session.user.role === 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold tracking-wide">
            <Logo className="h-7 w-7" />
            GS&amp;M <span className="text-slate-400 font-normal">Platform</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-md"
            >
              <FiLogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
