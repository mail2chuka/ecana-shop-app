import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import CustomerAdjustment from '@/models/CustomerAdjustment';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { verifyOwnPin } from '@/lib/verifyPassword';
import { requireObjectId } from '@/lib/validate';
import { ApiError } from '@/lib/apiError';
import { readJsonBody } from '@/lib/requestBody';

// Standalone (not sale-tied) surcharge/fund — see models/CustomerAdjustment.js.
async function _h_GET(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'adjustment id');
    const adjustment = await CustomerAdjustment.findById(id);
    if (!adjustment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: adjustment });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

// Editing a standalone surcharge/fund is admin-only and PIN-gated, same as editing a sale-tied
// adjustment, a sale, or a payment (see app/api/sales/[id]/adjustments/[adjId]/route.js).
async function _h_PUT(request, { params }) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const { id } = await params;
    requireObjectId(id, 'adjustment id');
    const { amount, reason, confirmPin } = await readJsonBody(request);

    const pinResult = await verifyOwnPin(session.user.id, confirmPin);
    if (pinResult === 'no_pin_set') throw new ApiError('Set your 4-digit PIN first, under Users', 400);
    if (pinResult !== 'ok') throw new ApiError('Incorrect PIN', 400);

    const newAmount = Number(amount);
    if (!newAmount || newAmount <= 0) throw new ApiError('Enter a valid amount', 400);
    if (!reason) throw new ApiError('A reason is required', 400);

    const mongoSession = await mongoose.startSession();
    try {
      let updated;

      await mongoSession.withTransaction(async () => {
        const adj = await CustomerAdjustment.findById(id).session(mongoSession);
        if (!adj) throw new ApiError('Adjustment not found', 404);

        const customer = await Customer.findById(adj.customer).session(mongoSession);
        if (!customer) throw new ApiError('Customer not found', 404);

        const isSurcharge = adj.type === 'surcharge';
        const before = adj.toObject();

        // Reverse this adjustment's original effect on the balance, then reapply the new amount —
        // same "undo, then redo" shape as editing a sale-tied adjustment, a sale, or a payment.
        customer.balance += isSurcharge ? adj.amount : -adj.amount;
        const balanceBefore = customer.balance;
        customer.balance += isSurcharge ? -newAmount : newAmount;
        const balanceAfter = customer.balance;
        await customer.save({ session: mongoSession });

        adj.amount = newAmount;
        adj.reason = reason;
        adj.balanceBefore = balanceBefore;
        adj.balanceAfter = balanceAfter;
        await adj.save({ session: mongoSession });

        await logAudit({
          userId: session.user.id, userName: session.user.name, action: 'edited', entity: 'CustomerAdjustment', entityId: adj._id,
          before, after: adj.toObject(), session: mongoSession,
        });

        updated = adj;
      });

      return NextResponse.json({ success: true, data: updated });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = withOrg(_h_GET);
export const PUT = withOrg(_h_PUT);
