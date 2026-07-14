import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';
import ATC from '@/models/ATC';
import CementBrand from '@/models/CementBrand';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todaySalesAgg,
      monthSalesAgg,
      activeCustomers,
      openATCs,
      atcBagsAgg,
      brandCount,
      negativeBalanceAgg,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'active', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { status: 'active', date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Customer.countDocuments({ isActive: true }),
      ATC.countDocuments({ status: { $ne: 'closed' }, bagsRemaining: { $gt: 0 } }),
      ATC.aggregate([
        { $match: { status: { $in: ['assigned', 'loaded', 'arrived'] }, bagsRemaining: { $gt: 0 } } },
        { $group: { _id: null, bags: { $sum: '$bagsRemaining' } } },
      ]),
      CementBrand.countDocuments({ isActive: true }),
      Customer.aggregate([
        { $match: { isActive: true, balance: { $lt: 0 } } },
        { $group: { _id: null, totalOwed: { $sum: '$balance' }, count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        todaySales: todaySalesAgg[0]?.total || 0,
        todayCount: todaySalesAgg[0]?.count || 0,
        monthSales: monthSalesAgg[0]?.total || 0,
        monthCount: monthSalesAgg[0]?.count || 0,
        activeCustomers,
        openATCs,
        availableBags: atcBagsAgg[0]?.bags || 0,
        brandCount,
        totalOwed: Math.abs(negativeBalanceAgg[0]?.totalOwed || 0),
        customersOwing: negativeBalanceAgg[0]?.count || 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
