import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import SubscriptionPayment from '@/models/SubscriptionPayment';

async function _h_GET() {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const org = await Organization.findById(session.user.organization)
      .select('name subscriptionStatus trialEndsAt subscriptionEndsAt freeForever monthlyPrice yearlyPrice');
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    const history = await SubscriptionPayment.find().sort({ createdAt: -1 }).limit(20);
    return NextResponse.json({ success: true, data: { org, history } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const GET = withOrg(_h_GET);
