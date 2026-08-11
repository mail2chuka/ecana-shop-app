import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWithOrg } from '@/lib/tenantScope';
import { hasModule, hasAnyModule } from '@/lib/modules';
import { rethrowIfNextInternal } from '@/lib/routeErrors';

// Re-exported so routes can import both from one place.
export { enterOrg } from '@/lib/tenantScope';

export async function getOrgSession() {
  return await getServerSession(authOptions);
}

// HOC: wraps a route handler so its ENTIRE body runs inside the tenant scope via AsyncLocalStorage.run()
// — the reliable primitive (enterWith does not survive await boundaries in this runtime). The handler
// keeps calling getOrgSession() itself; its queries are scoped because they execute inside this run().
// No org on the session (unauthenticated) → run un-wrapped so the handler's own guard returns 401 and
// the fail-closed plugin still throws on any query attempted without scope.
//
// Fail-closed read-only gate for the auditor role: rejected here, once, for every route — rather than
// trusting each individual route to remember a permission check — so the "read only account" guarantee
// holds even for routes that don't call can() at all.
//
// `requiredModules` (optional): a module name, or an array meaning "any of these" (e.g. trucks are
// shared by cement + aggregate) — routes belonging to a single subscribed-per-org module pass this so
// an org that never enabled it gets a clean 403 instead of reaching data it was never sold access to.
export function withOrg(handler, requiredModules) {
  return async (request, context) => {
    // Last-resort safety net: guarantees every API route returns valid JSON even if something
    // throws before reaching (or outside of) the handler's own try/catch — a missing import, a bad
    // destructure, anything. Without this, Next.js's default error handling can produce an empty or
    // non-JSON body, which breaks the client's `res.json()` with a cryptic "Unexpected end of JSON
    // input" instead of a readable error.
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.role === 'auditor' && request.method !== 'GET') {
        return NextResponse.json({ error: 'Your account is read-only' }, { status: 403 });
      }
      if (requiredModules) {
        const ok = Array.isArray(requiredModules) ? hasAnyModule(session, requiredModules) : hasModule(session, requiredModules);
        if (!ok) return NextResponse.json({ error: 'This feature is not enabled for your organization' }, { status: 403 });
      }
      const orgId = session?.user?.organization;
      if (!orgId) return await handler(request, context);
      return await runWithOrg(orgId, () => handler(request, context));
    } catch (e) {
      rethrowIfNextInternal(e);
      console.error(`[withOrg] Unhandled error in ${request.method} ${request.nextUrl?.pathname || request.url}:`, e);
      return NextResponse.json({ error: e?.message || 'Something went wrong. Please try again.' }, { status: e?.status || 500 });
    }
  };
}
