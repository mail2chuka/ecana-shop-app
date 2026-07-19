import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CementBrand from '@/models/CementBrand';
import { logAudit } from '@/lib/audit';
import { requireObjectId } from '@/lib/validate';

async function _h_PUT(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'cement brand id');
    const body = await request.json();
    const before = await CementBrand.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const update = {
      name: body.name,
      depotName: body.depot ? body.depot : null,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    };
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const updated = await CementBrand.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'CementBrand', entityId: id, before, after: updated });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}

async function _h_DELETE(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'cement brand id');
    const updated = await CementBrand.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'CementBrand', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}

export const PUT = withOrg(_h_PUT);
export const DELETE = withOrg(_h_DELETE);
