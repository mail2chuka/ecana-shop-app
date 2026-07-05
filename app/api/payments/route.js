import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Customer from '@/models/Customer';
import CustomerPayment from '@/models/CustomerPayment';
import { logAudit } from '@/lib/audit';
import { generateTransactionNumber } from '@/lib/transaction';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer');
    const query = {};
    if (customerId) query.customer = customerId;
    const payments = await CustomerPayment.find(query).sort({ date: -1 }).limit(200);
    return NextResponse.json({ success: true, data: payments });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const body = await request.json();
    const { customer: customerId, amount, method, depositorName, bankName, reference, notes, date } = body;
    if (!customerId || !amount || amount <= 0 || !method) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Customer, amount and method required' }, { status: 400 });
    }
    if (!depositorName || !bankName) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Depositor name and bank name required' }, { status: 400 });
    }
    const customer = await Customer.findById(customerId).session(mongoSession);
    if (!customer) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const balanceBefore = customer.balance;
    const balanceAfter = balanceBefore + Number(amount);
    const transactionNumber = await generateTransactionNumber('PAY');

    const payment = await CustomerPayment.create([{
      customer: customerId,
      customerName: customer.name,
      transactionNumber,
      amount: Number(amount),
      method,
      depositorName,
      bankName,
      reference,
      notes,
      date: date ? new Date(date) : new Date(),
      balanceBefore,
      balanceAfter,
      recordedBy: session.user.id,
      recordedByName: session.user.name,
    }], { session: mongoSession });

    customer.balance = balanceAfter;
    await customer.save({ session: mongoSession });

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'CustomerPayment', entityId: payment[0]._id, after: payment[0], session: mongoSession });

    await mongoSession.commitTransaction();
    return NextResponse.json({ success: true, data: payment[0] }, { status: 201 });
  } catch (e) {
    await mongoSession.abortTransaction();
    return NextResponse.json({ error: e.message }, { status: 400 });
  } finally {
    mongoSession.endSession();
  }
}
