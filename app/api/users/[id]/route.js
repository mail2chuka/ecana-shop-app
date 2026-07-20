import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';
import { requireObjectId } from '@/lib/validate';
import { assertUsernameAvailable } from '@/lib/username';

async function _h_PUT(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'user id');
    const body = await request.json();

    const user = await User.findById(id);
    if (!user) throw new ApiError('Not found', 404);

    if (typeof body.name === 'string') user.name = body.name;
    if (typeof body.isActive === 'boolean') user.isActive = body.isActive;
    if (body.email !== undefined) user.email = body.email || undefined;
    if (body.username !== undefined && user.role !== 'customer') {
      // Staff usernames are required logins, not optional fields — never allow clearing to blank,
      // and re-check global availability (excluding this same user) since it can be renamed here too.
      user.username = await assertUsernameAvailable(body.username, id);
    }
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.password) user.password = body.password;

    const before = user.toObject();
    delete before.password;
    await user.save();

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'User', entityId: id, before, after: { name: user.name, isActive: user.isActive, username: user.username, email: user.email } });
    const safe = user.toObject();
    delete safe.password;
    return NextResponse.json({ success: true, data: safe });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

async function _h_DELETE(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'user id');

    if (id === session.user.id) throw new ApiError("You can't delete your own account", 400);

    const user = await User.findById(id);
    if (!user) throw new ApiError('Not found', 404);

    if (user.role === 'admin') {
      const otherActiveAdmins = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: id } });
      if (otherActiveAdmins === 0) throw new ApiError('Cannot delete the last active admin account', 400);
    }

    const before = user.toObject();
    delete before.password;
    await User.findByIdAndDelete(id);

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deleted', entity: 'User', entityId: id, before });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const PUT = withOrg(_h_PUT);
export const DELETE = withOrg(_h_DELETE);
