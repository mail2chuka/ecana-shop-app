import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'No customers selected' }, { status: 400 });

    const customers = await Customer.find({ _id: { $in: ids } });
    if (customers.length !== ids.length) throw new ApiError('One or more customers not found', 404);
    const stillActive = customers.filter(c => c.isActive);
    if (stillActive.length > 0) {
      throw new ApiError(`Archive ${stillActive.map(c => c.name).join(', ')} before deleting permanently`, 400);
    }

    await logAudit({
      userId: session.user.id,
      userName: session.user.name,
      action: 'bulk_purged',
      entity: 'Customer',
      entityId: ids.join(','),
      before: customers,
    });

    const result = await Customer.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ success: true, data: { deletedCount: result.deletedCount } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}
