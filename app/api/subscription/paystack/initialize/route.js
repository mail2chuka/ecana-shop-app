import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import { initializeTransaction } from '@/lib/paystack';
import { ApiError } from '@/lib/apiError';

async function _h_POST(request) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const { plan } = await request.json();
    if (!['monthly', 'yearly'].includes(plan)) throw new ApiError('Plan must be monthly or yearly', 400);
    if (!session.user.email) throw new ApiError('Add an email to your account first (Users → Edit) to pay by card', 400);

    const org = await Organization.findById(session.user.organization).select('monthlyPrice yearlyPrice');
    if (!org) throw new ApiError('Organization not found', 404);
    const amountNaira = plan === 'monthly' ? org.monthlyPrice : org.yearlyPrice;
    if (!amountNaira || amountNaira <= 0) throw new ApiError('Pricing for this plan has not been set yet. Contact the platform owner.', 400);

    const origin = new URL(request.url).origin;
    const data = await initializeTransaction({
      email: session.user.email,
      amountNaira,
      callbackUrl: `${origin}/admin/subscription`,
      metadata: { organizationId: session.user.organization, plan },
    });

    return NextResponse.json({ success: true, data: { authorizationUrl: data.authorization_url } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const POST = withOrg(_h_POST);
