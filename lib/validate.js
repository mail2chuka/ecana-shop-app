import mongoose from 'mongoose';
import { ApiError } from './apiError';

/**
 * Validate that a string is a valid MongoDB ObjectId, throwing a sanitized
 * 400 ApiError otherwise (instead of leaking a Mongoose cast error).
 */
export function requireObjectId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(`Invalid ${label}`, 400);
  }
  return id;
}

/**
 * Wrap an async route handler with:
 *  - a guard that the user is authenticated (and optionally an admin),
 *  - centralized error handling that never leaks raw internal messages.
 *
 * Usage:
 *   export const POST = withAuth((req, ctx, session) => {...}, { admin: true });
 */
export function withAuth(handler, { admin = false } = {}) {
  return async (request, ctx) => {
    let session;
    try {
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('./auth');
      session = await getServerSession(authOptions);
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (admin && session.user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
      return await handler(request, ctx, session);
    } catch (e) {
      const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
      const message = status >= 500 ? 'Internal server error' : (e?.message || 'Request failed');
      return Response.json({ error: message }, { status });
    }
  };
}