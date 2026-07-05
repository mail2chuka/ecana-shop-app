import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const brandId = searchParams.get('brandId');

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

    const pipeline = [{ $match: match }, { $unwind: '$items' }];

    if (brandId) {
      const oid = new mongoose.Types.ObjectId(brandId);
      pipeline.push({ $match: { $or: [{ 'items.cementBrand': oid }, { 'items.stoneDustProduct': oid }] } });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            itemType: '$items.itemType',
            cementBrand: '$items.cementBrand',
            cementBrandName: '$items.cementBrandName',
            stoneDustProduct: '$items.stoneDustProduct',
            quarryName: '$items.quarryName',
            size: '$items.size',
          },
          billQty: { $sum: '$items.billQuantity' },
          actualQty: { $sum: '$items.actualQuantity' },
          total: { $sum: '$items.lineTotal' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          itemType: '$_id.itemType',
          brandId: { $ifNull: ['$_id.cementBrand', '$_id.stoneDustProduct'] },
          name: '$_id.cementBrandName',
          quarryName: '$_id.quarryName',
          size: '$_id.size',
          billQty: 1,
          actualQty: 1,
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    );

    const data = await Sale.aggregate(pipeline);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
