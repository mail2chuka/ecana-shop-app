'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { Logo } from '@/components/ui';

function destinationFor(role) {
  if (role === 'super_admin') return '/platform/organizations';
  if (role === 'customer') return '/customer';
  return '/admin';
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(destinationFor(session.user.role));
    }
  }, [status, session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', { emailOrUsername, password, redirect: false });
    if (result?.error) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    toast.success('Welcome');
    // Don't rely on useSession() reactively noticing the new cookie on its own schedule — fetch the
    // fresh session directly and navigate off it, so the redirect isn't a race against that timing.
    const freshSession = await getSession();
    router.replace(destinationFor(freshSession?.user?.role));
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <Logo className="h-20 w-20" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">GS&amp;M</h1>
            <p className="text-sm text-gray-300">Goods Sales and Management</p>
          </div>

          {/* Login Form */}
          <div className="bg-white border rounded-lg p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">Access your account</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email, Username, or Phone</label>
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    required
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
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

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200">
              <FiArrowLeft size={14} /> Back to home
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2026 GS&amp;M. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
