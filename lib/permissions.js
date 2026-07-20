// Central permission matrix. Admin implicitly holds every permission via the '*' wildcard.
// gsm_manager gets full run of Setup (create + edit + price changes) but never delete — deactivating
// a brand/quarry/truck/customer record stays admin-only, per "delicate operations" excluded on purpose.
const PERMISSIONS = {
  admin: ['*'],
  gsm_manager: [
    'customers.create', 'customers.edit',
    'sales.create', 'sales.edit', 'payments.create',
    'suppliers.create', 'suppliers.edit',
    'cementBrands.create', 'cementBrands.edit', 'cementBrands.priceChange',
    'stonedust.create', 'stonedust.edit', 'stonedust.priceChange',
    'trucks.create', 'trucks.edit',
  ],
  atc_manager: ['atcs.create', 'atcs.assign', 'atcs.loading', 'atcs.arrive'],
  // Read-only by design: no permissions granted here, and lib/session.js's withOrg() additionally
  // rejects every non-GET request for this role regardless of what's in this list.
  auditor: [],
};

export function can(role, permission) {
  if (!role) return false;
  const perms = PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

export const STAFF_ROLES = ['admin', 'gsm_manager', 'atc_manager', 'auditor'];
