import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Customer from '@/models/Customer';
import CustomerAdjustment from '@/models/CustomerAdjustment';
import { logAudit } from '@/lib/audit';
import { verifyOwnPin } from '@/lib/verifyPassword';
import { generateTransactionNumber } from '@/lib/transaction';
import { requireObjectId } from '@/lib/validate';
import { ApiError } from '@/lib/apiError';
import { readJsonBody } from '@/lib/requestBody';

// A fund (credit) not tied to any sale — e.g. a goodwill credit or an opening-balance correction.
// Same PIN/reason rules as a sale-tied fund (see app/api/sales/[id]/refund/route.js), just recorded
// on its own CustomerAdjustment document instead of a Sale's adjustments array.
async function _h_POST(request, { params }) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const { id } = await params;
    requireObjectId(id, 'customer id');
    const { amount, reason, confirmPin } = await readJsonBody(request);

    const pinResult = await verifyOwnPin(session.user.id, confirmPin);
    if (pinResult === 'no_pin_set') throw new ApiError('Set your 4-digit PIN first, under Users', 400);
    if (pinResult !== 'ok') throw new ApiError('Incorrect PIN', 400);
    if (!reason) throw new ApiError('A reason is required', 400);
    const fundAmount = Number(amount);
    if (!fundAmount || fundAmount <= 0) throw new ApiError('Enter a valid fund amount', 400);

    const mongoSession = await mongoose.startSession();
    try {
      let created;

      await mongoSession.withTransaction(async () => {
        const customer = await Customer.findById(id).session(mongoSession);
        if (!customer) throw new ApiError('Customer not found', 404);

        const balanceBefore = customer.balance;
        customer.balance += fundAmount;
        const balanceAfter = customer.balance;
        await customer.save({ session: mongoSession });

        const referenceNumber = await generateTransactionNumber(mongoSession);

        const adj = await CustomerAdjustment.create([{
          customer: customer._id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: 'refund',
          referenceNumber,
          amount: fundAmount,
          reason,
          balanceBefore,
          balanceAfter,
          appliedBy: session.user.id,
          appliedByName: session.user.name,
        }], { session: mongoSession });

        await logAudit({
          userId: session.user.id, userName: session.user.name, action: 'fund_applied_standalone', entity: 'CustomerAdjustment', entityId: adj[0]._id,
          after: { referenceNumber, amount: fundAmount, reason, balanceBefore, balanceAfter }, session: mongoSession,
        });

        created = adj[0];
      });

      return NextResponse.json({ success: true, data: created }, { status: 201 });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const POST = withOrg(_h_POST);
