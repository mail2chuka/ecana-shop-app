import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import { runUnscoped } from '@/lib/tenantScope';
import { ApiError } from '@/lib/apiError';

const TRIAL_DAYS = 14;

// Platform routes are cross-tenant: they deliberately run unscoped (all queries span every org).
// Middleware already gates /api/platform to the super_admin; we re-check here for defense in depth.
async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'super_admin') return null;
  return session;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const data = await runUnscoped(async () => {
      const orgs = await Organization.find().sort({ createdAt: 1 }).lean();
      const [users, custs, sales] = await Promise.all([
        User.aggregate([{ $group: { _id: '$organization', staff: { $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 0, 1] } } } }]),
        Customer.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$organization', n: { $sum: 1 } } }]),
        Sale.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$organization', n: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } }]),
      ]);
      const idx = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x]));
      const um = idx(users), cm = idx(custs), sm = idx(sales);
      return orgs.map((o) => ({
        _id: o._id, name: o.name, slug: o.slug,
        subscriptionStatus: o.subscriptionStatus, freeForever: o.freeForever, trialEndsAt: o.trialEndsAt,
        enabledModules: o.enabledModules, isActive: o.isActive, createdAt: o.createdAt,
        staffCount: um[String(o._id)]?.staff || 0,
        customerCount: cm[String(o._id)]?.n || 0,
        salesCount: sm[String(o._id)]?.n || 0,
        revenue: sm[String(o._id)]?.revenue || 0,
      }));
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const body = await request.json();
  const orgName = (body.orgName || '').trim();
  const adminName = (body.adminName || '').trim();
  const adminUsername = (body.adminUsername || '').trim().toLowerCase();
  const adminPassword = body.adminPassword || '';
  const slug = (body.slug || orgName).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const enabledModules = Array.isArray(body.enabledModules) && body.enabledModules.length ? body.enabledModules : ['cement', 'aggregate', 'shop'];

  try {
    if (!orgName || !adminName || !adminUsername || !adminPassword) throw new ApiError('Business name, admin name, username and password are all required', 400);
    if (!slug) throw new ApiError('Could not derive a valid slug from the business name', 400);

    const result = await runUnscoped(async () => {
      if (await Organization.findOne({ slug })) throw new ApiError(`The slug "${slug}" is already taken`, 400);
      if (await User.findOne({ username: adminUsername })) throw new ApiError(`The username "${adminUsername}" is already taken`, 400);

      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const org = await Organization.create({
        name: orgName, slug, enabledModules,
        subscriptionStatus: 'trialing', trialEndsAt, freeForever: false, isActive: true,
      });
      // Explicit organization: this user belongs to the NEW org, not the platform admin's — and we're
      // unscoped, so the plugin won't stamp it for us.
      const admin = await User.create({
        organization: org._id, name: adminName, username: adminUsername, password: adminPassword,
        role: 'admin', isActive: true,
      });
      return { orgId: org._id, adminId: admin._id, slug: org.slug };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}
