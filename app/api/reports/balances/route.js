import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import CustomerPayment from '@/models/CustomerPayment';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const monthFrom = searchParams.get('monthFrom'); // 'YYYY-MM'
    const monthTo = searchParams.get('monthTo'); // 'YYYY-MM'

    const query = { isActive: true };
    if (filter === 'negative') query.balance = { $lt: 0 };
    else if (filter === 'positive') query.balance = { $gt: 0 };

    const customers = await Customer.find(query).sort({ balance: 1 });

    const totals = customers.reduce(
      (acc, c) => {
        if (c.balance < 0) {
          acc.totalOwed += Math.abs(c.balance);
          acc.owingCount++;
        } else if (c.balance > 0) {
          acc.totalCredit += c.balance;
          acc.creditCount++;
        } else acc.zeroCount++;
        return acc;
      },
      { totalOwed: 0, totalCredit: 0, owingCount: 0, creditCount: 0, zeroCount: 0 }
    );
    totals.net = totals.totalCredit - totals.totalOwed;

    // Monthly summary: new debt incurred (credit sales) vs. surplus received (payments) per calendar
    // month. This is an activity total, not a reconstructed point-in-time balance — the app doesn't
    // keep historical month-end balance snapshots, and each customer's balance already folds in
    // whatever opening balance they started with, so replaying transactions can't reliably
    // reproduce a true historical total. Activity per month is what can be computed honestly.
    let dateRange;
    if (monthFrom || monthTo) {
      dateRange = {};
      if (monthFrom) dateRange.$gte = new Date(`${monthFrom}-01T00:00:00.000Z`);
      if (monthTo) {
        const [y, m] = monthTo.split('-').map(Number);
        dateRange.$lte = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      }
    }

    const saleMatch = { status: 'active', saleType: { $ne: 'shop' } };
    const paymentMatch = {};
    if (dateRange) {
      saleMatch.date = dateRange;
      paymentMatch.date = dateRange;
    }

    const [debtByMonth, surplusByMonth, adjustmentsByMonth] = await Promise.all([
      Sale.aggregate([
        { $match: saleMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$grandTotal' } } },
      ]),
      CustomerPayment.aggregate([
        { $match: paymentMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } },
      ]),
      // Surcharges/refunds move balance independently of the original sale — grouped by the month
      // they were actually applied (adjustments.appliedAt), not the original sale's month.
      Sale.aggregate([
        { $match: { 'adjustments.0': { $exists: true } } },
        { $unwind: '$adjustments' },
        ...(dateRange ? [{ $match: { 'adjustments.appliedAt': dateRange } }] : []),
        { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$adjustments.appliedAt' } }, type: '$adjustments.type' }, total: { $sum: '$adjustments.amount' } } },
      ]),
    ]);

    const monthMap = new Map();
    for (const row of debtByMonth) {
      monthMap.set(row._id, { month: row._id, debtAdded: row.total, surplusAdded: 0 });
    }
    for (const row of surplusByMonth) {
      const existing = monthMap.get(row._id);
      if (existing) existing.surplusAdded = row.total;
      else monthMap.set(row._id, { month: row._id, debtAdded: 0, surplusAdded: row.total });
    }
    for (const row of adjustmentsByMonth) {
      const month = row._id.month;
      if (!monthMap.has(month)) monthMap.set(month, { month, debtAdded: 0, surplusAdded: 0 });
      const entry = monthMap.get(month);
      if (row._id.type === 'surcharge') entry.debtAdded += row.total;
      else entry.surplusAdded += row.total;
    }
    const monthly = Array.from(monthMap.values())
      .map(m => ({ ...m, net: m.surplusAdded - m.debtAdded }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json({ success: true, data: { customers, totals, monthly } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
