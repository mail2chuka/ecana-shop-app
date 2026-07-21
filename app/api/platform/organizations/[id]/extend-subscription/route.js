import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import { runUnscoped, runWithOrg } from '@/lib/tenantScope';
import { extendSubscription } from '@/lib/subscription';
import { requireObjectId } from '@/lib/validate';
import { ApiError } from '@/lib/apiError';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'super_admin') return null;
  return session;
}

export async function POST(request, { params }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const { id } = await params;
    requireObjectId(id, 'organization id');
    const { plan } = await request.json();
    if (!['monthly', 'yearly'].includes(plan)) throw new ApiError('Plan must be monthly or yearly', 400);

    const org = await runUnscoped(() => Organization.findById(id).select('monthlyPrice yearlyPrice'));
    if (!org) throw new ApiError('Not found', 404);
    const amount = plan === 'monthly' ? org.monthlyPrice : org.yearlyPrice;

    const { org: updated } = await runWithOrg(id, () => extendSubscription({
      orgId: id, plan, amount, method: 'manual',
      recordedBy: session.user.id, recordedByName: session.user.name,
    }));

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}
