import { AsyncLocalStorage } from 'node:async_hooks';
import mongoose from 'mongoose';

// Holds the current request's tenant context: either { organizationId } (scoped) or { unscoped: true }.
// If neither is set, tenant models FAIL CLOSED — any query throws rather than silently returning
// another org's data. The few legitimate global paths (login lookup, migration, platform admin)
// opt out explicitly with runUnscoped().
//
// Pinned to globalThis so it's a true singleton: Next/webpack can evaluate this module as separate
// instances across route bundles, and if the route's run() and a model plugin's getStore() landed on
// different AsyncLocalStorage objects, every scoped query would fail closed. One shared instance fixes that.
const storage = globalThis.__ecanaTenantStorage || (globalThis.__ecanaTenantStorage = new AsyncLocalStorage());

// Wrap an async operation so every tenant query inside it is scoped to orgId.
// fn is awaited INSIDE the context so a returned (lazy) Mongoose Query actually executes in-scope
// — returning the un-awaited query would run it after the context has already popped.
export function runWithOrg(orgId, fn) {
  return storage.run({ organizationId: String(orgId) }, async () => { return await fn(); });
}

// Set the scope for the remainder of the current async execution (used at the top of route handlers,
// where wrapping the whole body in a callback would be unwieldy). Each request/invocation is its own
// async context, so this does not bleed across requests.
// Must be called in the route handler's OWN frame (not inside a nested async helper) so the store
// persists across the handler's subsequent awaits. No-op on a falsy orgId (unauthenticated request);
// the route's own auth guard then returns 401 before any query runs.
export function enterOrg(orgId) {
  if (!orgId) return;
  storage.enterWith({ organizationId: String(orgId) });
}

// Run trusted, cross-tenant code (login user lookup, migration, super-admin) without scoping.
// fn is awaited inside the context (see runWithOrg) so a returned lazy Query executes unscoped.
export function runUnscoped(fn) {
  return storage.run({ unscoped: true }, async () => { return await fn(); });
}

export function getCurrentOrg() {
  return storage.getStore()?.organizationId || null;
}

// Route helper: call at the top of an authed handler (after the session/permission check).
// Enters the tenant context for the rest of the handler and returns the org id for generators.
export function requireOrg(session) {
  const orgId = session?.user?.organization;
  if (!orgId) {
    const err = new Error('No organization on this session');
    err.status = 401;
    throw err;
  }
  enterOrg(orgId);
  return orgId;
}

const QUERY_HOOKS = [
  'count', 'countDocuments', 'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
  'findOneAndReplace', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne', 'distinct',
];

// Applied per-schema (in each tenant model file) rather than globally, so it's immune to
// model-compile ordering and stays inert for schemas without an `organization` path (e.g. Organization).
export function tenantPlugin(schema) {
  if (!schema.path('organization')) return;

  schema.pre(QUERY_HOOKS, function (next) {
    const store = storage.getStore();
    if (store?.unscoped || this.getOptions?.()?.unscoped) return next();
    const orgId = store?.organizationId;
    if (!orgId) return next(new Error('Tenant scope missing: a query ran without an organization context'));
    this.setQuery({ ...this.getQuery(), organization: new mongoose.Types.ObjectId(orgId) });
    next();
  });

  schema.pre('aggregate', function (next) {
    const store = storage.getStore();
    if (store?.unscoped || this.options?.unscoped) return next();
    const orgId = store?.organizationId;
    if (!orgId) return next(new Error('Tenant scope missing: an aggregation ran without an organization context'));
    this.pipeline().unshift({ $match: { organization: new mongoose.Types.ObjectId(orgId) } });
    next();
  });

  // Stamp on VALIDATE, not save: Mongoose runs validation before pre('save') hooks, so stamping in
  // pre('save') would be too late — `required: true` on organization would already have failed.
  schema.pre('validate', function (next) {
    if (!this.isNew || this.organization) return next();
    const store = storage.getStore();
    if (store?.unscoped) return next(); // trusted path is responsible for setting organization itself
    const orgId = store?.organizationId;
    if (!orgId) return next(new Error('Tenant scope missing: a document was created without an organization context'));
    this.organization = new mongoose.Types.ObjectId(orgId);
    next();
  });

  schema.pre('insertMany', function (next, docs) {
    const store = storage.getStore();
    if (store?.unscoped) return next();
    const orgId = store?.organizationId;
    if (!orgId) return next(new Error('Tenant scope missing: insertMany ran without an organization context'));
    const oid = new mongoose.Types.ObjectId(orgId);
    for (const d of docs) { if (!d.organization) d.organization = oid; }
    next();
  });
}
