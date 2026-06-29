import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import StoneDustProduct from '@/models/StoneDustProduct';
import { logAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const before = await StoneDustProduct.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    delete body.currentPricePerTonne;
    const updated = await StoneDustProduct.findByIdAndUpdate(id, body, { new: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'StoneDustProduct', entityId: id, before, after: updated });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const updated = await StoneDustProduct.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'StoneDustProduct', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
