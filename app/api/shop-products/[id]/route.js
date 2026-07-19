import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ShopProduct from '@/models/ShopProduct';
import { logAudit } from '@/lib/audit';

async function _h_PUT(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const before = await ShopProduct.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const update = {
      name: body.name,
      unit: body.unit,
      price: body.price !== undefined ? Number(body.price) : undefined,
      cementBrand: body.cementBrand || undefined,
    };
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

    const updated = await ShopProduct.findByIdAndUpdate(id, update, { new: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'ShopProduct', entityId: id, before, after: updated });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

async function _h_DELETE(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const updated = await ShopProduct.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'ShopProduct', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export const PUT = withOrg(_h_PUT);
export const DELETE = withOrg(_h_DELETE);
