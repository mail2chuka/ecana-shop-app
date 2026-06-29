import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search')?.toLowerCase();

    const match = { status: 'active' };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        match.date.$lte = e;
      }
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$customer',
          customerId: { $first: '$customer' },
          customerName: { $first: '$customerName' },
          businessName: { $first: '$businessName' },
          customerPhone: { $first: '$customerPhone' },
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { customerName: { $regex: search, $options: 'i' } },
            { businessName: { $regex: search, $options: 'i' } },
            { customerPhone: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { total: -1 } });
    pipeline.push({
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customerData',
      },
    });
    pipeline.push({
      $addFields: {
        balance: { $arrayElemAt: ['$customerData.balance', 0] },
      },
    });

    const data = await Sale.aggregate(pipeline);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
