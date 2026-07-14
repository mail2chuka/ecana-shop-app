import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import StoneDustProduct from '@/models/StoneDustProduct';
import { logAudit } from '@/lib/audit';
import { requireObjectId } from '@/lib/validate';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'stone dust product id');
    const body = await request.json();
    const before = await StoneDustProduct.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const update = {
      size: body.size,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    };
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    const updated = await StoneDustProduct.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'StoneDustProduct', entityId: id, before, after: updated });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'stone dust product id');
    const updated = await StoneDustProduct.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'StoneDustProduct', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}
