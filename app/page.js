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
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white border rounded-lg p-6 shadow-sm">
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
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-sm text-gray-500">
          © 2026 Ecana Materials. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
