import Customer from '@/models/Customer';
import { generateCustomerId } from '@/lib/customerId';
import { isShopCustomer, isWalkInCustomer } from '@/lib/shopStock';

// Every organization that enables the "shop" module needs both special customers ("Shop" and
// "Walk-in Customer" — see lib/shopStock.js for what each represents) or the Cement Warehouse
// is silently broken: no restocking mechanism, no walk-in default. Call this — inside the org's
// tenant context (runWithOrg/enterOrg) — whenever "shop" becomes enabled, both at org creation
// and if it's toggled on later. Idempotent: only creates whichever one is missing.
export async function ensureShopSpecialCustomers(createdBy) {
  const all = await Customer.find({}, 'name');
  const needsShop = !all.some(isShopCustomer);
  const needsWalkIn = !all.some(isWalkInCustomer);

  if (needsShop) {
    await Customer.create({ customerId: await generateCustomerId(), name: 'Shop', phone: '0000000000', createdBy });
  }
  if (needsWalkIn) {
    await Customer.create({ customerId: await generateCustomerId(), name: 'Walk-in Customer', phone: '0000000000', createdBy });
  }
}
