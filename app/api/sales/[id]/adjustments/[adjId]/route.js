import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { verifyOwnPin } from '@/lib/verifyPassword';
import { requireObjectId } from '@/lib/validate';
import { ApiError } from '@/lib/apiError';

// Editing a surcharge/refund is admin-only and PIN-gated, same as editing a sale or a payment.
async function _h_PUT(request, { params }) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const { id, adjId } = await params;
    requireObjectId(id, 'sale id');
    requireObjectId(adjId, 'adjustment id');
    const body = await request.json();
    const { amount, reason, method, confirmPin } = body;

    const pinResult = await verifyOwnPin(session.user.id, confirmPin);
    if (pinResult === 'no_pin_set') throw new ApiError('Set your 4-digit PIN first, under Users', 400);
    if (pinResult !== 'ok') throw new ApiError('Incorrect PIN', 400);

    const newAmount = Number(amount);
    if (!newAmount || newAmount <= 0) throw new ApiError('Enter a valid amount', 400);
    if (!reason) throw new ApiError('A reason is required', 400);

    const mongoSession = await mongoose.startSession();
    try {
      let updatedSale;

      await mongoSession.withTransaction(async () => {
        const sale = await Sale.findById(id).session(mongoSession);
        if (!sale) throw new ApiError('Sale not found', 404);
        if (sale.status === 'cancelled') throw new ApiError('Cannot edit an adjustment on a cancelled sale', 400);

        const adj = sale.adjustments.id(adjId);
        if (!adj) throw new ApiError('Adjustment not found', 404);

        const customer = await Customer.findById(sale.customer).session(mongoSession);
        if (!customer) throw new ApiError('Customer not found', 404);

        const isSurcharge = adj.type === 'surcharge';
        const before = adj.toObject();

        // Reverse this adjustment's original effect on the balance, then reapply the new amount —
        // same "undo, then redo" shape as editing a sale or payment. Surcharge subtracts from
        // balance (increases debt); refund adds to it — reversing/reapplying each uses the opposite sign.
        customer.balance += isSurcharge ? adj.amount : -adj.amount;
        const balanceBefore = customer.balance;
        customer.balance += isSurcharge ? -newAmount : newAmount;
        const balanceAfter = customer.balance;
        await customer.save({ session: mongoSession });

        adj.amount = newAmount;
        adj.reason = reason;
        if (isSurcharge && method) adj.method = method;
        adj.balanceBefore = balanceBefore;
        adj.balanceAfter = balanceAfter;
        await sale.save({ session: mongoSession });

        await logAudit({
          userId: session.user.id, userName: session.user.name, action: 'edited', entity: 'Sale', entityId: sale._id,
          before: { adjustment: before }, after: { adjustment: adj.toObject() }, session: mongoSession,
        });

        updatedSale = sale;
      });

      return NextResponse.json({ success: true, data: updatedSale });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const PUT = withOrg(_h_PUT);
