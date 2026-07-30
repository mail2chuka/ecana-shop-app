import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import CustomerPayment from '@/models/CustomerPayment';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { verifyOwnPin } from '@/lib/verifyPassword';
import { resolveDate } from '@/lib/dayLock';
import { requireObjectId } from '@/lib/validate';
import { ApiError } from '@/lib/apiError';

const ALLOWED_METHODS = ['cash', 'transfer', 'pos', 'cheque'];

async function _h_GET(request, { params }) {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'payment id');
    const payment = await CustomerPayment.findById(id);
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: payment });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

// Editing a recorded payment is admin-only and PIN-gated, same as editing a sale or a surcharge/refund.
async function _h_PUT(request, { params }) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const { id } = await params;
    requireObjectId(id, 'payment id');
    const body = await request.json();
    const { amount, method, depositorName, bankName, description, date, confirmPin } = body;

    const pinResult = await verifyOwnPin(session.user.id, confirmPin);
    if (pinResult === 'no_pin_set') throw new ApiError('Set your 4-digit PIN first, under Users', 400);
    if (pinResult !== 'ok') throw new ApiError('Incorrect PIN', 400);

    const newAmount = Number(amount);
    if (!newAmount || newAmount <= 0) throw new ApiError('Enter a valid amount', 400);
    if (!ALLOWED_METHODS.includes(method)) throw new ApiError('Invalid payment method', 400);
    if (!depositorName || !bankName) throw new ApiError('Depositor name and bank name required', 400);

    const mongoSession = await mongoose.startSession();
    try {
      let updatedPayment;

      await mongoSession.withTransaction(async () => {
        const payment = await CustomerPayment.findById(id).session(mongoSession);
        if (!payment) throw new ApiError('Not found', 404);

        const customer = await Customer.findById(payment.customer).session(mongoSession);
        if (!customer) throw new ApiError('Customer not found', 404);

        const before = payment.toObject();

        // Reverse this payment's original effect on the balance, then reapply the new amount — same
        // "undo, then redo" shape as editing a sale.
        customer.balance -= payment.amount;
        const balanceBefore = customer.balance;
        customer.balance += newAmount;
        const balanceAfter = customer.balance;
        await customer.save({ session: mongoSession });

        payment.amount = newAmount;
        payment.method = method;
        payment.depositorName = depositorName;
        payment.bankName = bankName;
        payment.description = description;
        payment.date = date ? resolveDate(date) : payment.date;
        payment.balanceBefore = balanceBefore;
        payment.balanceAfter = balanceAfter;
        await payment.save({ session: mongoSession });

        await logAudit({
          userId: session.user.id, userName: session.user.name, action: 'edited', entity: 'CustomerPayment', entityId: payment._id,
          before, after: payment, session: mongoSession,
        });

        updatedPayment = payment;
      });

      return NextResponse.json({ success: true, data: updatedPayment });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = withOrg(_h_GET);
export const PUT = withOrg(_h_PUT);
