import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import CustomerPayment from '@/models/CustomerPayment';
import { logAudit } from '@/lib/audit';
import { generateCustomerId } from '@/lib/customerId';
import { findDuplicateCustomerName } from '@/lib/customerName';
import { can } from '@/lib/permissions';
import { normalizeCreditLimit } from '@/lib/creditLimit';

const DORMANT_MS = 14 * 24 * 60 * 60 * 1000;

export const GET = withOrg(async (request) => {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const query = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: re }, { phone: re }, { businessName: re }, { customerId: re }];
    }
    // Server no longer filters by active/archived/dormant — the client fetches everything matching
    // search once and derives all four category counts (All/Active/Dormant/Archived) from one set,
    // the same way the ATC page derives its status-tab counts from a single unfiltered fetch.
    const customers = await Customer.find(query).collation({ locale: 'en', strength: 2 }).sort({ name: 1 }).limit(500);
    const ids = customers.map((c) => c._id);
    const [saleAgg, paymentAgg] = await Promise.all([
      Sale.aggregate([{ $match: { customer: { $in: ids }, status: 'active' } }, { $group: { _id: '$customer', last: { $max: '$date' } } }]),
      CustomerPayment.aggregate([{ $match: { customer: { $in: ids } } }, { $group: { _id: '$customer', last: { $max: '$date' } } }]),
    ]);
    const lastTxnMap = new Map();
    for (const s of saleAgg) lastTxnMap.set(String(s._id), s.last);
    for (const p of paymentAgg) {
      const key = String(p._id);
      const cur = lastTxnMap.get(key);
      if (!cur || p.last > cur) lastTxnMap.set(key, p.last);
    }

    const now = Date.now();
    const data = customers.map((c) => {
      const lastTransactionAt = lastTxnMap.get(String(c._id)) || null;
      // Dormancy is measured from whichever is more recent — their last real transaction, or when
      // the account was created — so a brand-new customer isn't instantly flagged dormant just for
      // not having transacted yet.
      const reference = lastTransactionAt && lastTransactionAt > c.createdAt ? lastTransactionAt : c.createdAt;
      const isDormant = c.isActive && (now - new Date(reference).getTime() >= DORMANT_MS);
      return { ...c.toObject(), lastTransactionAt, isDormant };
    });

    return NextResponse.json({ success: true, data });
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
    const duplicate = await findDuplicateCustomerName(Customer, body.name);
    if (duplicate) {
      return NextResponse.json({ error: `A customer named "${duplicate.name}" already exists — use a different name, or add something to distinguish this one` }, { status: 400 });
    }
    const customerId = await generateCustomerId();
    const customer = await Customer.create({
      customerId,
      name: body.name,
      phone: body.phone,
      address: body.address,
      businessName: body.businessName,
      balance: Number(body.openingBalance) || 0,
      creditLimit: normalizeCreditLimit(body.creditLimit),
      createdBy: session.user.id,
    });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'Customer', entityId: customer._id, after: customer });
    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});
