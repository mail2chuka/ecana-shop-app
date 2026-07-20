import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { STAFF_ROLES } from '@/lib/permissions';

/**
 * Server-side route protection (defense-in-depth).
 * - `/admin/*` — staff roles only (per-page/API permission checks happen further downstream).
 * - `/customer/*` — the `customer` role only.
 * - `/api/*` (except `/api/auth/*`) — a `customer` session may only reach `/api/customer-portal/*`;
 *   every other API route is reserved for staff roles even though most of those routes only check
 *   "is there a session" themselves — this is what actually keeps a customer login from reading
 *   other customers' sales, payments, or statements via those staff-oriented endpoints.
 */
export default async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Platform (SaaS owner) area — spans all organizations, gated to platform admins only.
  if (pathname.startsWith('/platform')) {
    if (!token || !token.isPlatformAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (!token || !STAFF_ROLES.includes(token.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/customer')) {
    if (!token || token.role !== 'customer') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    if (pathname.startsWith('/api/platform')) {
      if (!token || !token.isPlatformAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.next();
    }
    if (token?.role === 'customer' && !pathname.startsWith('/api/customer-portal')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/platform/:path*', '/admin/:path*', '/customer/:path*', '/api/:path*'],
};
