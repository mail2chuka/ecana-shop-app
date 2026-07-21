import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
// Registers the Customer schema with Mongoose so .populate('linkedCustomer') below can resolve it —
// without this explicit import, it silently depended on some other route having loaded Customer
// first in the same process, which fails on a fresh server start (or serverless cold start).
import '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';
import { generateUsername, assertUsernameAvailable } from '@/lib/username';

const ROLES = ['admin', 'gsm_manager', 'atc_manager', 'auditor', 'customer'];
const ROLE_RANK = Object.fromEntries(ROLES.map((r, i) => [r, i]));

async function _h_GET() {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    // Name-sorted first, then a stable re-sort by role rank — grouped by role, alphabetical within
    // each group, rather than either sorted alone.
    const users = await User.find().populate('linkedCustomer', 'name phone').sort({ name: 1 });
    users.sort((a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99));
    return NextResponse.json({ success: true, data: users });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function _h_POST(request) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    const { name, role, email, username, phone, password, linkedCustomer } = body;

    if (!name || !role || !password) throw new ApiError('Name, role, and password required', 400);
    if (!ROLES.includes(role)) throw new ApiError('Invalid role', 400);

    let finalUsername;
    if (role === 'customer') {
      if (!phone) throw new ApiError('Phone required for a customer login', 400);
      if (!linkedCustomer) throw new ApiError('Select which customer this login belongs to', 400);
    } else {
      // Username is a required, globally-unique login identity for staff accounts — auto-generated
      // from their name when left blank, otherwise validated for availability before creation.
      finalUsername = username ? await assertUsernameAvailable(username) : await generateUsername(name);
    }

    const user = await User.create({
      name,
      role,
      email: email || undefined,
      username: finalUsername,
      phone: role === 'customer' ? phone : undefined,
      password,
      linkedCustomer: role === 'customer' ? linkedCustomer : undefined,
    });

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'User', entityId: user._id, after: { name: user.name, role: user.role, email: user.email, username: user.username, phone: user.phone } });
    const safe = user.toObject();
    delete safe.password;
    return NextResponse.json({ success: true, data: safe }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = withOrg(_h_GET);
export const POST = withOrg(_h_POST);
