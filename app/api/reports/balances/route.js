import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    const query = { isActive: true };
    if (filter === 'owing') query.balance = { $lt: 0 };
    else if (filter === 'credit') query.balance = { $gt: 0 };
    else if (filter === 'zero') query.balance = 0;

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

    return NextResponse.json({ success: true, data: { customers, totals } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
