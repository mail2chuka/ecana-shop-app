import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import CustomerPayment from '@/models/CustomerPayment';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [sales, payments] = await Promise.all([
      Sale.find({ customer: id, status: 'active' }).sort({ date: -1 }).limit(200),
      CustomerPayment.find({ customer: id }).sort({ date: -1 }).limit(200),
    ]);

    // Build combined ledger
    const ledger = [];
    sales.forEach(s => ledger.push({
      date: s.date,
      type: 'sale',
      ref: s.saleNumber,
      description: `Sale: ${s.items.map(i => `${i.billQuantity} ${i.itemType === 'cement' ? 'bag' : 'tonne'} ${i.cementBrandName || `${i.quarryName} ${i.size}`}`).join(', ')}`,
      debit: s.grandTotal,
      credit: 0,
      balance: s.balanceAfter,
      id: s._id,
    }));
    payments.forEach(p => ledger.push({
      date: p.date,
      type: 'payment',
      ref: p.transactionNumber,
      description: `Payment via ${p.method}`,
      debit: 0,
      credit: p.amount,
      balance: p.balanceAfter,
      id: p._id,
      transactionNumber: p.transactionNumber,
      method: p.method,
      amount: p.amount,
      depositorName: p.depositorName,
      bankName: p.bankName,
      reference: p.reference,
    }));
    ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({ success: true, data: { customer, ledger } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
