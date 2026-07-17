import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { ids, isActive } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'No customers selected' }, { status: 400 });
    if (typeof isActive !== 'boolean') return NextResponse.json({ error: 'isActive must be true or false' }, { status: 400 });

    const result = await Customer.updateMany({ _id: { $in: ids } }, { $set: { isActive } });

    await logAudit({
      userId: session.user.id,
      userName: session.user.name,
      action: isActive ? 'bulk_reactivated' : 'bulk_deactivated',
      entity: 'Customer',
      entityId: ids.join(','),
      after: { ids, count: result.modifiedCount },
    });

    return NextResponse.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}
