import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWithOrg } from '@/lib/tenantScope';

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
export function withOrg(handler) {
  return async (request, context) => {
    const session = await getServerSession(authOptions);
    if (session?.user?.role === 'auditor' && request.method !== 'GET') {
      return NextResponse.json({ error: 'Your account is read-only' }, { status: 403 });
    }
    const orgId = session?.user?.organization;
    if (!orgId) return handler(request, context);
    return runWithOrg(orgId, () => handler(request, context));
  };
}
