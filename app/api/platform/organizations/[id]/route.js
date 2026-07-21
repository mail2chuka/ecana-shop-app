import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import { runUnscoped, runWithOrg } from '@/lib/tenantScope';
import { logAudit } from '@/lib/audit';
import { requireObjectId } from '@/lib/validate';
import { ApiError } from '@/lib/apiError';

const VALID_MODULES = ['cement', 'aggregate', 'shop'];
const VALID_STATUSES = ['trialing', 'active', 'past_due', 'canceled'];

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'super_admin') return null;
  return session;
}

export async function GET(request, { params }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const { id } = await params;
    requireObjectId(id, 'organization id');
    const data = await runUnscoped(async () => {
      const org = await Organization.findById(id).lean();
      if (!org) throw new ApiError('Not found', 404);
      const staff = await User.find({ organization: id, role: { $ne: 'customer' } }, 'name role email username phone isActive createdAt').sort({ createdAt: 1 }).lean();
      const [customerCount, salesAgg] = await Promise.all([
        Customer.countDocuments({ organization: id, isActive: true }),
        Sale.aggregate([{ $match: { organization: org._id, status: 'active' } }, { $group: { _id: null, n: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } }]),
      ]);
      return {
        ...org,
        staff,
        customerCount,
        salesCount: salesAgg[0]?.n || 0,
        revenue: salesAgg[0]?.revenue || 0,
      };
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const { id } = await params;
    requireObjectId(id, 'organization id');
    const body = await request.json();

    const update = {};
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
    if (Array.isArray(body.enabledModules)) {
      const mods = body.enabledModules.filter((m) => VALID_MODULES.includes(m));
      if (mods.length === 0) throw new ApiError('At least one module must stay enabled', 400);
      update.enabledModules = mods;
    }
    if (body.subscriptionStatus !== undefined) {
      if (!VALID_STATUSES.includes(body.subscriptionStatus)) throw new ApiError('Invalid subscription status', 400);
      update.subscriptionStatus = body.subscriptionStatus;
    }
    if (body.trialEndsAt !== undefined) update.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
    if (typeof body.freeForever === 'boolean') update.freeForever = body.freeForever;
    if (typeof body.isActive === 'boolean') update.isActive = body.isActive;
    if (body.monthlyPrice !== undefined) {
      const n = Number(body.monthlyPrice);
      if (!Number.isFinite(n) || n < 0) throw new ApiError('Invalid monthly price', 400);
      update.monthlyPrice = n;
    }
    if (body.yearlyPrice !== undefined) {
      const n = Number(body.yearlyPrice);
      if (!Number.isFinite(n) || n < 0) throw new ApiError('Invalid yearly price', 400);
      update.yearlyPrice = n;
    }

    const result = await runWithOrg(id, async () => {
      const before = await Organization.findById(id).lean();
      if (!before) throw new ApiError('Not found', 404);
      const updated = await Organization.findByIdAndUpdate(id, update, { new: true, runValidators: true });
      await logAudit({
        userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'Organization', entityId: id,
        before: { subscriptionStatus: before.subscriptionStatus, isActive: before.isActive, freeForever: before.freeForever, enabledModules: before.enabledModules, name: before.name },
        after: { subscriptionStatus: updated.subscriptionStatus, isActive: updated.isActive, freeForever: updated.freeForever, enabledModules: updated.enabledModules, name: updated.name },
      });
      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}
