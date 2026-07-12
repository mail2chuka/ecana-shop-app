import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Server-side route protection (defense-in-depth).
 * This blocks unauthenticated users and non-admins from `/admin/*` before
 * the page bundle is served.
 */
export default async function middleware(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token.role !== 'admin') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};