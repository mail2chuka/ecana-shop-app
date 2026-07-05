import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import CementBrand from '@/models/CementBrand';
import PriceHistory from '@/models/PriceHistory';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
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
    let updatedBrand;

    await mongoSession.withTransaction(async () => {
      const brand = await CementBrand.findById(id).session(mongoSession);
      if (!brand) throw new ApiError('Not found', 404);

      const oldPrice = brand.currentPricePerBag;
      await PriceHistory.create([{
        productType: 'cement',
        productId: id,
        productName: brand.name,
        oldPrice,
        newPrice: Number(newPrice),
        changedBy: session.user.id,
        changedByName: session.user.name,
        reason,
      }], { session: mongoSession });
      brand.currentPricePerBag = Number(newPrice);
      await brand.save({ session: mongoSession });
      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'price_change', entity: 'CementBrand', entityId: id, before: { price: oldPrice }, after: { price: newPrice }, session: mongoSession });

      updatedBrand = brand;
    });

    return NextResponse.json({ success: true, data: updatedBrand });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}
