import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';

async function _h_GET(request) {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day';
    const brandId = searchParams.get('brandId');
    const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;

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
    if (brandId) {
      const oid = new mongoose.Types.ObjectId(brandId);
      match.$or = [{ 'items.cementBrand': oid }, { 'items.stoneDustProduct': oid }];
    }

    let dateFormat;
    if (groupBy === 'month') dateFormat = '%Y-%m';
    else if (groupBy === 'year') dateFormat = '%Y';
    else dateFormat = '%Y-%m-%d';

    const grouped = await Sale.aggregate([
      { $match: match },
      // $sum as a $group accumulator expects a per-document scalar — it won't reach into the
      // `items` array on its own, so the per-sale quantity/transport totals are computed here
      // first (where $sum is used as an expression operator, which does sum array elements).
      {
        $addFields: {
          _saleQty: { $sum: '$items.billQuantity' },
        },
      },
      {
        $group: {
          _id: { period: { $dateToString: { format: dateFormat, date: '$date' } }, saleType: '$saleType' },
          total: { $sum: '$grandTotal' },
          subtotal: { $sum: '$subtotal' },
          count: { $sum: 1 },
          quantity: { $sum: '$_saleQty' },
          transport: { $sum: '$transportFee' },
        },
      },
      { $sort: { '_id.period': sortDir } },
    ]);

    const totals = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$saleType',
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({ success: true, data: { grouped, totals } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const GET = withOrg(_h_GET);
