import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import ShopProduct from '@/models/ShopProduct';
import ATC from '@/models/ATC';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const { id } = await params;
  const { quantity, atcId, notes } = await request.json();
  const qty = Number(quantity);
  if (!qty || qty <= 0) return NextResponse.json({ error: 'Enter a valid quantity' }, { status: 400 });

  const mongoSession = await mongoose.startSession();
  try {
    let updatedProduct;

    await mongoSession.withTransaction(async () => {
      const product = await ShopProduct.findById(id).session(mongoSession);
      if (!product) throw new ApiError('Product not found', 404);

      if (atcId) {
        const atc = await ATC.findById(atcId).session(mongoSession);
        if (!atc) throw new ApiError('ATC not found', 404);
        if (atc.status === 'closed') throw new ApiError(`ATC ${atc.atcNumber} is closed`, 400);
        if (qty > atc.bagsRemaining) throw new ApiError(`Only ${atc.bagsRemaining} bags remaining on ATC ${atc.atcNumber}`, 400);

        atc.bagsRemaining -= qty;
        if (atc.bagsRemaining === 0) atc.status = 'closed';
        await atc.save({ session: mongoSession });

        await logAudit({ userId: session.user.id, userName: session.user.name, action: 'transferred_to_shop', entity: 'ATC', entityId: atc._id, after: { atcNumber: atc.atcNumber, bagsTransferred: qty, shopProduct: product.name }, session: mongoSession });
      }

      product.stockQuantity += qty;
      await product.save({ session: mongoSession });

      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'restocked', entity: 'ShopProduct', entityId: product._id, after: { quantity: qty, newStock: product.stockQuantity, atcId: atcId || null, notes }, session: mongoSession });

      updatedProduct = product;
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}
