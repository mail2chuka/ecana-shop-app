import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { generateCustomerId } from '@/lib/customerId';
import { can } from '@/lib/permissions';

export const GET = withOrg(async (request) => {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'active';
    const query = {};
    if (status === 'active') query.isActive = true;
    else if (status === 'archived') query.isActive = false;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: re }, { phone: re }, { businessName: re }, { customerId: re }];
    }
    const customers = await Customer.find(query).sort({ name: 1 }).limit(500);
    return NextResponse.json({ success: true, data: customers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const POST = withOrg(async (request) => {
  try {
    const session = await getOrgSession();
    if (!session || !can(session.user.role, 'customers.create')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    if (!body.name || !body.phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });
    const customerId = await generateCustomerId();
    const customer = await Customer.create({
      customerId,
      name: body.name,
      phone: body.phone,
      address: body.address,
      businessName: body.businessName,
      balance: Number(body.openingBalance) || 0,
      creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
      createdBy: session.user.id,
    });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'Customer', entityId: customer._id, after: customer });
    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});
