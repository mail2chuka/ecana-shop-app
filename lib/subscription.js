import Organization from '@/models/Organization';
import SubscriptionPayment from '@/models/SubscriptionPayment';
import { logAudit } from '@/lib/audit';

const PLAN_DAYS = { monthly: 30, yearly: 365 };

// Shared by both the super_admin's manual extension and a verified Paystack payment. Caller is
// responsible for running this inside the target org's tenant context (runWithOrg) — this only
// assumes that's already true, since manual (unscoped super_admin) and Paystack (already org-scoped)
// callers arrive here from different contexts.
export async function extendSubscription({ orgId, plan, amount, method, paystackReference, recordedBy, recordedByName }) {
  if (!PLAN_DAYS[plan]) throw new Error('Invalid plan');

  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found');

  // Extend from whichever is later: now, or the current paid-through date (so renewing early doesn't
  // forfeit remaining paid time).
  const base = org.subscriptionEndsAt && new Date(org.subscriptionEndsAt) > new Date() ? new Date(org.subscriptionEndsAt) : new Date();
  const periodEnd = new Date(base.getTime() + PLAN_DAYS[plan] * 24 * 60 * 60 * 1000);

  org.subscriptionEndsAt = periodEnd;
  org.subscriptionStatus = 'active';
  await org.save();

  const payment = await SubscriptionPayment.create({
    organization: orgId, plan, amount, method, paystackReference,
    periodStart: base, periodEnd, recordedBy, recordedByName,
  });

  await logAudit({
    userId: recordedBy, userName: recordedByName, action: 'subscription_extended', entity: 'Organization', entityId: orgId,
    after: { plan, method, periodEnd, amount },
  });

  return { org, payment };
}

// Single source of truth for "can this org's staff currently log in" — used at login time.
// Dynamic and date-driven rather than relying on a stored status a background job would need to flip.
// Returns null if access is fine, or a specific user-facing reason if not.
export function checkOrgAccess(org) {
  if (org.freeForever) return null;
  if (!org.isActive) return "This organization's access has been suspended. Contact the platform owner.";
  if (org.subscriptionStatus === 'canceled') return 'This subscription has been canceled. Contact the platform owner to reactivate.';
  if (org.subscriptionEndsAt && new Date(org.subscriptionEndsAt) > new Date()) return null;
  if (org.subscriptionStatus === 'trialing' && org.trialEndsAt && new Date(org.trialEndsAt) > new Date()) return null;
  return 'Your free trial has ended. Please subscribe to continue using GS&M.';
}
