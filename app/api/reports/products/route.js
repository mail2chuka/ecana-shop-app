import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';
import CementBrand from '@/models/CementBrand';
import StoneDustProduct from '@/models/StoneDustProduct';

async function _h_GET(request) {
  try {
    const session = await getOrgSession();
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
      // Deleting a brand/product only deactivates it (isActive: false) — editing one can also
      // leave old sales pointing at a since-recreated doc with a different _id. Match on the
      // product's stable display name (what the picker actually shows) instead of its id, so
      // filtering to one brand/product surfaces every historical sale recorded under that name,
      // not just sales tied to whichever document id happens to be active right now.
      const [cementBrand, stoneDustProduct] = await Promise.all([
        CementBrand.findById(oid).select('name'),
        StoneDustProduct.findById(oid).select('quarryName'),
      ]);

      if (cementBrand) {
        pipeline.push({
          $match: { $expr: { $eq: [{ $trim: { input: { $ifNull: ['$items.cementBrandName', ''] } } }, cementBrand.name.trim()] } },
        });
      } else if (stoneDustProduct) {
        pipeline.push({
          $match: { $expr: { $eq: [{ $trim: { input: { $ifNull: ['$items.quarryName', ''] } } }, stoneDustProduct.quarryName.trim()] } },
        });
      } else {
        pipeline.push({ $match: { $or: [{ 'items.cementBrand': oid }, { 'items.stoneDustProduct': oid }] } });
      }
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

export const GET = withOrg(_h_GET);
