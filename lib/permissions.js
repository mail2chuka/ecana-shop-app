// Central permission matrix. Admin implicitly holds every permission via the '*' wildcard.
const PERMISSIONS = {
  admin: ['*'],
  gsm_manager: ['customers.create', 'sales.create', 'sales.edit', 'payments.create'],
  atc_manager: ['atcs.create', 'atcs.assign', 'atcs.loading', 'atcs.arrive'],
};

export function can(role, permission) {
  if (!role) return false;
  const perms = PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

export const STAFF_ROLES = ['admin', 'gsm_manager', 'atc_manager'];
