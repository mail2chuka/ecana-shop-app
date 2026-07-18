import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';
import { logAudit } from '@/lib/audit';
import { verifyOwnPin } from '@/lib/verifyPassword';
import { ApiError } from '@/lib/apiError';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;
  const { amount, reason, confirmPin } = await request.json();

  const pinResult = await verifyOwnPin(session.user.id, confirmPin);
  if (pinResult === 'no_pin_set') {
    return NextResponse.json({ error: 'Set your 4-digit PIN first, under Users' }, { status: 400 });
  }
  if (pinResult !== 'ok') {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  const refundAmount = Number(amount);
  if (!refundAmount || refundAmount <= 0) return NextResponse.json({ error: 'Enter a valid refund amount' }, { status: 400 });

  const mongoSession = await mongoose.startSession();
  try {
    let updatedSale;

    await mongoSession.withTransaction(async () => {
      const sale = await Sale.findById(id).session(mongoSession);
      if (!sale) throw new ApiError('Not found', 404);
      if (sale.status === 'cancelled') throw new ApiError('Cannot adjust a cancelled sale', 400);
      if (sale.saleType === 'shop') throw new ApiError('Refunds do not apply to shop sales', 400);

      const customer = await Customer.findById(sale.customer).session(mongoSession);
      if (!customer) throw new ApiError('Customer not found', 404);

      const balanceBefore = customer.balance;
      customer.balance += refundAmount;
      const balanceAfter = customer.balance;
      await customer.save({ session: mongoSession });

      sale.adjustments.push({
        type: 'refund',
        method: 'shortfall',
        amount: refundAmount,
        reason,
        appliedBy: session.user.id,
        appliedByName: session.user.name,
        balanceBefore,
        balanceAfter,
      });
      await sale.save({ session: mongoSession });

      await logAudit({
        userId: session.user.id, userName: session.user.name, action: 'refund_applied', entity: 'Sale', entityId: sale._id,
        after: { amount: refundAmount, reason, balanceBefore, balanceAfter }, session: mongoSession,
      });

      updatedSale = sale;
    });

    return NextResponse.json({ success: true, data: updatedSale });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}
