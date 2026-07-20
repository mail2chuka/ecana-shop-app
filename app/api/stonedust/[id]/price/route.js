import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import StoneDustProduct from '@/models/StoneDustProduct';
import PriceHistory from '@/models/PriceHistory';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';
import { can } from '@/lib/permissions';

async function _h_POST(request, { params }) {
  const session = await getOrgSession();
  if (!session || !can(session.user.role, 'stonedust.priceChange')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;
  const { newPrice, reason } = await request.json();
  if (!newPrice || newPrice <= 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
  }

  const mongoSession = await mongoose.startSession();
  try {
    let updatedProduct;

    await mongoSession.withTransaction(async () => {
      const product = await StoneDustProduct.findById(id).session(mongoSession);
      if (!product) throw new ApiError('Not found', 404);

      const oldPrice = product.currentPricePerTonne;
      await PriceHistory.create([{
        productType: 'stonedust',
        productId: id,
        productName: `${product.quarryName} ${product.size}`,
        oldPrice,
        newPrice: Number(newPrice),
        changedBy: session.user.id,
        changedByName: session.user.name,
        reason,
      }], { session: mongoSession });
      product.currentPricePerTonne = Number(newPrice);
      await product.save({ session: mongoSession });
      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'price_change', entity: 'StoneDustProduct', entityId: id, before: { price: oldPrice }, after: { price: newPrice }, session: mongoSession });

      updatedProduct = product;
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}

export const POST = withOrg(_h_POST);
