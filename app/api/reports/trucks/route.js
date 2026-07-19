import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';

async function _h_GET(request) {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const match = { status: 'active', truck: { $ne: null } };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        match.date.$lte = e;
      }
    }

    const data = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$truck',
          plateNumber: { $first: '$truckPlate' },
          driverName: { $first: '$driverName' },
          trips: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          transportFees: { $sum: '$transportFee' },
          lastTrip: { $max: '$date' },
        },
      },
      { $sort: { trips: -1 } },
    ]);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const GET = withOrg(_h_GET);
