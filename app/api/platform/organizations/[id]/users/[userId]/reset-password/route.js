import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { runUnscoped, runWithOrg } from '@/lib/tenantScope';
import { logAudit } from '@/lib/audit';
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
    const { id, userId } = await params;
    requireObjectId(id, 'organization id');
    requireObjectId(userId, 'user id');
    const { newPassword } = await request.json();
    if (!newPassword || newPassword.length < 4) throw new ApiError('Password must be at least 4 characters', 400);

    const result = await runUnscoped(() => User.findById(userId));
    if (!result || String(result.organization) !== String(id)) throw new ApiError('Not found', 404);

    await runWithOrg(id, async () => {
      result.password = newPassword;
      await result.save();
      await logAudit({
        userId: session.user.id, userName: session.user.name, action: 'password_reset', entity: 'User', entityId: userId,
        after: { note: `Password reset by platform super_admin for ${result.name}` },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}
