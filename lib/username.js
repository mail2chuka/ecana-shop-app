import User from '@/models/User';
import { runUnscoped } from '@/lib/tenantScope';
import { ApiError } from '@/lib/apiError';

function slugify(name) {
  const base = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return base || 'user';
}

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

// Usernames are globally unique login identities (one identity = one org, per lib/tenantScope.js),
// so this must check across every organization, not just the caller's — mirrors the unscoped
// login lookup in lib/auth.js. Tenant-scoped models fail closed on any query without runUnscoped().
async function usernameExists(username) {
  const existing = await runUnscoped(() => User.findOne({ username }).select('_id'));
  return !!existing;
}

export async function generateUsername(name) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  while (await usernameExists(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

export async function assertUsernameAvailable(rawUsername) {
  const username = normalizeUsername(rawUsername);
  if (!username) throw new ApiError('Username required', 400);
  if (await usernameExists(username)) throw new ApiError('That username is already taken', 400);
  return username;
}
