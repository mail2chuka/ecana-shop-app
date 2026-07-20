import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { requireObjectId } from '@/lib/validate';
import { can } from '@/lib/permissions';

async function _h_GET(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'customer id');
    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: customer });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: e.status || 500 });
  }
}

async function _h_PUT(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session || !can(session.user.role, 'customers.edit')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'customer id');
    const body = await request.json();
    const update = {
      name: body.name,
      phone: body.phone,
      address: body.address,
      businessName: body.businessName,
      creditLimit: body.creditLimit !== undefined ? Number(body.creditLimit) : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    };
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    const before = await Customer.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await Customer.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'Customer', entityId: id, before, after: updated });
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
    requireObjectId(id, 'customer id');
    const updated = await Customer.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'Customer', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}

export const GET = withOrg(_h_GET);
export const PUT = withOrg(_h_PUT);
export const DELETE = withOrg(_h_DELETE);
