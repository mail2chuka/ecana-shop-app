import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import StoneDustProduct from '@/models/StoneDustProduct';
import PriceHistory from '@/models/PriceHistory';
import { logAudit } from '@/lib/audit';

export async function POST(request, { params }) {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const { id } = await params;
    const { newPrice, reason } = await request.json();
    if (!newPrice || newPrice <= 0) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    const product = await StoneDustProduct.findById(id).session(mongoSession);
    if (!product) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
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
    await mongoSession.commitTransaction();
    return NextResponse.json({ success: true, data: product });
  } catch (e) {
    await mongoSession.abortTransaction();
    return NextResponse.json({ error: e.message }, { status: 400 });
  } finally {
    mongoSession.endSession();
  }
}
