import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';
import { requireObjectId } from '@/lib/validate';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
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
    if (body.username !== undefined) user.username = body.username || undefined;
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.password) user.password = body.password;

    const before = user.toObject();
    delete before.password;
    await user.save();

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'User', entityId: id, before, after: { name: user.name, isActive: user.isActive } });
    const safe = user.toObject();
    delete safe.password;
    return NextResponse.json({ success: true, data: safe });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}
