import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CementBrand from '@/models/CementBrand';
import { logAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const before = await CementBrand.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    delete body.currentPricePerBag;

    if (body.depot) {
      body.depotName = body.depot;
    } else {
      body.depotName = null;
    }
    delete body.depot;

    const updated = await CementBrand.findByIdAndUpdate(id, body, { new: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'CementBrand', entityId: id, before, after: updated });
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
    const updated = await CementBrand.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'CementBrand', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
