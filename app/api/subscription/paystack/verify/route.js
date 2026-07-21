import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import SubscriptionPayment from '@/models/SubscriptionPayment';
import { verifyTransaction } from '@/lib/paystack';
import { extendSubscription } from '@/lib/subscription';
import { runWithOrg } from '@/lib/tenantScope';
import { ApiError } from '@/lib/apiError';

async function _h_GET(request) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    if (!reference) throw new ApiError('Missing reference', 400);

    // Idempotency: a page refresh after a successful verify shouldn't extend the subscription twice.
    const already = await SubscriptionPayment.findOne({ paystackReference: reference });
    if (already) return NextResponse.json({ success: true, data: { alreadyProcessed: true } });

    const txn = await verifyTransaction(reference);
    if (txn.status !== 'success') throw new ApiError(`Payment was not successful (${txn.status})`, 400);

    const plan = txn.metadata?.plan;
    if (!['monthly', 'yearly'].includes(plan)) throw new ApiError('Could not determine plan from payment metadata', 400);
    // The caller's OWN session decides which org gets credited — metadata is only a cross-check, so a
    // tampered reference/metadata pair can't be used to extend a different organization.
    if (String(txn.metadata?.organizationId) !== String(session.user.organization)) {
      throw new ApiError('This payment does not belong to your organization', 400);
    }
    const amount = txn.amount / 100; // kobo -> naira

    const { org } = await runWithOrg(session.user.organization, () => extendSubscription({
      orgId: session.user.organization, plan, amount, method: 'paystack', paystackReference: reference,
    }));

    return NextResponse.json({ success: true, data: { org } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = withOrg(_h_GET);
