// Which business modules an org subscribed to (Organization.enabledModules) — cached on the session
// at login (lib/auth.js), same tradeoff as organizationName: a super_admin module change takes effect
// on the user's next login, not instantly, since sessions aren't re-validated against the DB per request.
export const MODULES = ['cement', 'aggregate', 'shop'];

// `enabledModules` missing entirely (session predates this field, or org lookup failed) fails open
// rather than locking every org out until they re-login — the actual gate is `enabledModules` being
// present AND not containing the module, not merely "falsy".
export function hasModule(session, moduleName) {
  const enabled = session?.user?.enabledModules;
  if (!enabled) return true;
  return enabled.includes(moduleName);
}

export function hasAnyModule(session, moduleNames) {
  return moduleNames.some((m) => hasModule(session, m));
}

// Sale.saleType -> the module that gates creating/editing that kind of sale.
export function moduleForSaleType(saleType) {
  if (saleType === 'stonedust') return 'aggregate';
  if (saleType === 'shop') return 'shop';
  return 'cement';
}
