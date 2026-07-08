import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';
import ATC from '@/models/ATC';
import ShopProduct from '@/models/ShopProduct';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;
  const { reason } = await request.json();

  const mongoSession = await mongoose.startSession();
  try {
    let cancelledSale;

    await mongoSession.withTransaction(async () => {
      const sale = await Sale.findById(id).session(mongoSession);
      if (!sale) throw new ApiError('Not found', 404);
      if (sale.status === 'cancelled') throw new ApiError('Already cancelled', 400);

      // Shop sales are paid immediately and never touched the customer's balance,
      // so cancelling one must not refund a balance that was never debited.
      if (sale.saleType !== 'shop') {
        const customer = await Customer.findById(sale.customer).session(mongoSession);
        if (customer) {
          customer.balance = customer.balance + sale.grandTotal;
          await customer.save({ session: mongoSession });
        }
      }

      // Restore ATC bags / shop stock
      for (const item of sale.items) {
        if (item.itemType === 'cement' && item.atc) {
          const atc = await ATC.findById(item.atc).session(mongoSession);
          if (atc) {
            atc.bagsRemaining += item.actualQuantity;
            if (atc.status === 'closed' && atc.bagsRemaining > 0) atc.status = 'arrived';
            await atc.save({ session: mongoSession });
          }
        } else if (item.itemType === 'shop' && item.shopProduct) {
          const product = await ShopProduct.findById(item.shopProduct).session(mongoSession);
          if (product) {
            product.stockQuantity += item.billQuantity;
            await product.save({ session: mongoSession });
          }
        }
      }

      sale.status = 'cancelled';
      sale.cancelledAt = new Date();
      sale.cancelledBy = session.user.id;
      sale.cancellationReason = reason;
      await sale.save({ session: mongoSession });

      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'cancelled', entity: 'Sale', entityId: id, after: { reason }, session: mongoSession });

      cancelledSale = sale;
    });

    return NextResponse.json({ success: true, data: cancelledSale });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}
