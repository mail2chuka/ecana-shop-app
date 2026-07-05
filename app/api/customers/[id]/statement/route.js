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
      createdAt: s.createdAt,
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
      createdAt: p.createdAt,
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
    // Recompute a running balance in true chronological order (oldest first), anchored to the
    // customer's current balance. Stored balanceAfter snapshots reflect the balance at the moment
    // each transaction was entered, not its chosen date — backdated entries make those snapshots
    // inconsistent when displayed in date order, so we derive the column fresh instead of trusting it.
    const chronological = [...ledger].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    const totalCredit = chronological.reduce((s, e) => s + e.credit, 0);
    const totalDebit = chronological.reduce((s, e) => s + e.debit, 0);
    let running = customer.balance - totalCredit + totalDebit;
    chronological.forEach(entry => {
      running += entry.credit - entry.debit;
      entry.balance = running;
    });

    // Latest first for display
    const sortedLedger = [...chronological].reverse();

    return NextResponse.json({ success: true, data: { customer, ledger: sortedLedger } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
