'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(`/${session.user.role}`);
    }
  }, [status, session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', { emailOrUsername, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Welcome');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <svg className="h-20 w-20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#ffffff" strokeWidth="3"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#b3e5fc" strokeWidth="6"/>
                <circle cx="50" cy="50" r="28" fill="none" stroke="#ffffff" strokeWidth="3"/>
                <circle cx="50" cy="50" r="12" fill="#90ee90"/>
                <line x1="50" y1="10" x2="50" y2="30" stroke="#ffffff" strokeWidth="3"/>
                <line x1="50" y1="70" x2="50" y2="90" stroke="#ffffff" strokeWidth="3"/>
                <line x1="10" y1="50" x2="30" y2="50" stroke="#ffffff" strokeWidth="3"/>
                <line x1="70" y1="50" x2="90" y2="50" stroke="#ffffff" strokeWidth="3"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">GSM</h1>
            <p className="text-sm text-gray-300">Goods Sales and Management</p>
          </div>

          {/* Login Form */}
          <div className="bg-white border rounded-lg p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">Access your account</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email or Username</label>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                  required
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                  required
                  placeholder="Enter password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2026 Ecana Family Limited. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
