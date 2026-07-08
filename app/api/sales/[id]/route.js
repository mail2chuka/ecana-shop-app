import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';
import ATC from '@/models/ATC';
import Customer from '@/models/Customer';
import Truck from '@/models/Truck';
import StoneDustProduct from '@/models/StoneDustProduct';
import ShopProduct from '@/models/ShopProduct';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const sale = await Sale.findById(id);
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: sale });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;
  const { reason } = await request.json().catch(() => ({}));

  const mongoSession = await mongoose.startSession();
  try {
    let deletedSnapshot;

    await mongoSession.withTransaction(async () => {
      const sale = await Sale.findById(id).session(mongoSession);
      if (!sale) throw new ApiError('Not found', 404);
      if (sale.status === 'cancelled') throw new ApiError('This sale was already cancelled', 400);

      // Reverse the sale's effects on stock/balance, same as a cancellation would.
      if (sale.saleType !== 'shop') {
        const customer = await Customer.findById(sale.customer).session(mongoSession);
        if (customer) {
          customer.balance += sale.grandTotal;
          await customer.save({ session: mongoSession });
        }
      }

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

      deletedSnapshot = sale.toObject();

      // Log the full snapshot before removing the document, so a deleted sale is still traceable in the audit log.
      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deleted', entity: 'Sale', entityId: sale._id, before: deletedSnapshot, after: { reason: reason || null }, session: mongoSession });

      await Sale.deleteOne({ _id: sale._id }).session(mongoSession);
    });

    return NextResponse.json({ success: true, data: deletedSnapshot });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;
  const body = await request.json();
  const { items, discount, transportFee, date, notes, truck: truckId, paymentMethod } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'At least one item required' }, { status: 400 });
  }

  const mongoSession = await mongoose.startSession();
  try {
    let updatedSale;

    await mongoSession.withTransaction(async () => {
      const sale = await Sale.findById(id).session(mongoSession);
      if (!sale) throw new ApiError('Not found', 404);
      if (sale.status === 'cancelled') throw new ApiError('Cannot edit a cancelled sale', 400);

      const isShopSale = sale.saleType === 'shop';
      if (isShopSale && !['cash', 'transfer', 'pos', 'cheque'].includes(paymentMethod)) {
        throw new ApiError('Payment method required for shop sales', 400);
      }

      // --- Reverse the sale's original effects on stock/balance ---
      for (const oldItem of sale.items) {
        if (oldItem.itemType === 'cement' && oldItem.atc) {
          const atc = await ATC.findById(oldItem.atc).session(mongoSession);
          if (atc) {
            atc.bagsRemaining += oldItem.actualQuantity;
            if (atc.status === 'closed' && atc.bagsRemaining > 0) atc.status = 'arrived';
            await atc.save({ session: mongoSession });
          }
        } else if (oldItem.itemType === 'shop' && oldItem.shopProduct) {
          const product = await ShopProduct.findById(oldItem.shopProduct).session(mongoSession);
          if (product) {
            product.stockQuantity += oldItem.billQuantity;
            await product.save({ session: mongoSession });
          }
        }
      }

      const customer = await Customer.findById(sale.customer).session(mongoSession);
      if (!customer) throw new ApiError('Customer not found', 404);
      if (!isShopSale) {
        customer.balance += sale.grandTotal;
      }

      // --- Re-validate and apply the edited items ---
      const processedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const billQty = Number(item.billQuantity);
        const actualQty = Number(item.actualQuantity || item.billQuantity);
        const unitPrice = Number(item.unitPrice);
        if (billQty <= 0 || unitPrice < 0) throw new ApiError('Invalid quantity or price in items', 400);
        const lineTotal = billQty * unitPrice;

        if (item.itemType === 'cement') {
          if (!item.atc) throw new ApiError('Cement item must reference an ATC', 400);
          const atc = await ATC.findById(item.atc).session(mongoSession);
          if (!atc) throw new ApiError('ATC not found', 404);
          if (atc.status === 'closed') throw new ApiError(`ATC ${atc.atcNumber} is closed`, 400);
          if (actualQty > atc.bagsRemaining) {
            throw new ApiError(`Only ${atc.bagsRemaining} bags remaining on ATC ${atc.atcNumber}`, 400);
          }
          atc.bagsRemaining -= actualQty;
          if (atc.bagsRemaining === 0) atc.status = 'closed';
          await atc.save({ session: mongoSession });

          processedItems.push({
            itemType: 'cement',
            atc: atc._id,
            atcNumber: atc.atcNumber,
            cementBrand: atc.cementBrand,
            cementBrandName: atc.cementBrandName,
            billQuantity: billQty,
            actualQuantity: actualQty,
            unitPrice,
            lineTotal,
          });
        } else if (item.itemType === 'stonedust') {
          if (!item.stoneDustProduct) throw new ApiError('Aggregate item must reference a product', 400);
          const product = await StoneDustProduct.findById(item.stoneDustProduct).session(mongoSession);
          if (!product) throw new ApiError('Aggregate product not found', 404);
          processedItems.push({
            itemType: 'stonedust',
            stoneDustProduct: product._id,
            quarryName: product.quarryName,
            size: product.size,
            billQuantity: billQty,
            actualQuantity: actualQty,
            unitPrice,
            lineTotal,
          });
        } else if (item.itemType === 'shop') {
          if (!item.shopProduct) throw new ApiError('Shop item must reference a product', 400);
          const product = await ShopProduct.findById(item.shopProduct).session(mongoSession);
          if (!product) throw new ApiError('Shop product not found', 404);
          if (billQty > product.stockQuantity) {
            throw new ApiError(`Only ${product.stockQuantity} ${product.unit}(s) of ${product.name} in stock`, 400);
          }
          product.stockQuantity -= billQty;
          await product.save({ session: mongoSession });

          processedItems.push({
            itemType: 'shop',
            shopProduct: product._id,
            shopProductName: product.name,
            billQuantity: billQty,
            actualQuantity: billQty,
            unitPrice,
            lineTotal,
          });
        } else {
          throw new ApiError('Invalid item type', 400);
        }

        subtotal += lineTotal;
      }

      const disc = Number(discount) || 0;
      const transport = Number(transportFee) || 0;
      const grandTotal = subtotal - disc + transport;

      const balanceBefore = customer.balance;
      const balanceAfter = isShopSale ? balanceBefore : balanceBefore - grandTotal;

      if (!isShopSale && customer.creditLimit !== null && customer.creditLimit !== undefined) {
        if (balanceAfter < -customer.creditLimit) {
          throw new ApiError(`Credit limit exceeded. Customer can owe up to ₦${customer.creditLimit.toLocaleString()}.`, 400);
        }
      }

      let truckData = { truck: undefined, truckPlate: undefined, driverName: undefined };
      if (truckId) {
        const truck = await Truck.findById(truckId).session(mongoSession);
        if (truck) truckData = { truck: truck._id, truckPlate: truck.plateNumber, driverName: truck.driverName };
      }

      const before = sale.toObject();

      sale.items = processedItems;
      sale.subtotal = subtotal;
      sale.discount = disc;
      sale.transportFee = transport;
      sale.grandTotal = grandTotal;
      sale.balanceBefore = balanceBefore;
      sale.balanceAfter = balanceAfter;
      sale.date = date ? new Date(date) : sale.date;
      sale.notes = notes;
      sale.truck = truckData.truck;
      sale.truckPlate = truckData.truckPlate;
      sale.driverName = truckData.driverName;
      if (isShopSale) sale.paymentMethod = paymentMethod;
      sale.editedAt = new Date();
      sale.editedBy = session.user.id;
      sale.editedByName = session.user.name;
      await sale.save({ session: mongoSession });

      if (!isShopSale) {
        customer.balance = balanceAfter;
      }
      await customer.save({ session: mongoSession });

      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'edited', entity: 'Sale', entityId: sale._id, before, after: sale, session: mongoSession });

      updatedSale = sale;
    });

    return NextResponse.json({ success: true, data: updatedSale });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}
