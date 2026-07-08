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
import { generateTransactionNumber } from '@/lib/transaction';
import { ApiError } from '@/lib/apiError';
import { formatCustomerLabel } from '@/lib/format';

async function nextSaleNumber() {
  const year = new Date().getFullYear();
  const prefix = `S-${year}-`;
  const last = await Sale.findOne({ saleNumber: new RegExp(`^${prefix}`) }).sort({ saleNumber: -1 });
  let n = 1;
  if (last) {
    const m = last.saleNumber.match(/-(\d+)$/);
    if (m) n = parseInt(m[1]) + 1;
  }
  return `${prefix}${String(n).padStart(4, '0')}`;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer');
    const saleType = searchParams.get('type');
    const status = searchParams.get('status') || 'active';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query = {};
    if (customerId) query.customer = customerId;
    if (saleType) query.saleType = saleType;
    if (status !== 'all') query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const sales = await Sale.find(query).sort({ date: -1 }).limit(500);
    return NextResponse.json({ success: true, data: sales });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const body = await request.json();
  const { saleType, customer: customerId, truck: truckId, date, items, discount, transportFee, notes, deliveryDeparture, deliveryReturn, paymentMethod } = body;

  if (!saleType || !customerId || !items || items.length === 0) {
    return NextResponse.json({ error: 'Sale type, customer and at least one item required' }, { status: 400 });
  }
  if (saleType === 'shop' && !['cash', 'transfer', 'pos', 'cheque'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Payment method required for shop sales' }, { status: 400 });
  }

  const mongoSession = await mongoose.startSession();
  try {
    let createdSale;

    await mongoSession.withTransaction(async () => {
      const customer = await Customer.findById(customerId).session(mongoSession);
      if (!customer) throw new ApiError('Customer not found', 404);

      let truckData = {};
      if (truckId) {
        const truck = await Truck.findById(truckId).session(mongoSession);
        if (truck) {
          truckData = { truck: truck._id, truckPlate: truck.plateNumber, driverName: truck.driverName };
        }
      }

      // Process items
      const processedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const billQty = Number(item.billQuantity);
        const actualQty = Number(item.actualQuantity || item.billQuantity);
        const unitPrice = Number(item.unitPrice);
        if (billQty <= 0 || unitPrice < 0) {
          throw new ApiError('Invalid quantity or price in items', 400);
        }
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

      // Shop sales are paid for immediately (cash/transfer/pos/cheque) — no credit extended,
      // so the customer's running balance is untouched.
      const isShopSale = saleType === 'shop';
      const balanceBefore = customer.balance;
      const balanceAfter = isShopSale ? balanceBefore : balanceBefore - grandTotal;

      if (!isShopSale && customer.creditLimit !== null && customer.creditLimit !== undefined) {
        // creditLimit = max they can owe (i.e. how negative balance can go)
        if (balanceAfter < -customer.creditLimit) {
          throw new ApiError(`Credit limit exceeded. Customer can owe up to ₦${customer.creditLimit.toLocaleString()}.`, 400);
        }
      }

      const saleNumber = await nextSaleNumber();
      const transactionNumber = await generateTransactionNumber('SAL');

      const sale = await Sale.create([{
        saleNumber,
        transactionNumber,
        saleType,
        customer: customer._id,
        customerName: formatCustomerLabel(customer),
        customerPhone: customer.phone,
        ...truckData,
        date: date ? new Date(date) : new Date(),
        items: processedItems,
        subtotal,
        discount: disc,
        transportFee: transport,
        grandTotal,
        paymentMethod: isShopSale ? paymentMethod : 'balance',
        balanceBefore,
        balanceAfter,
        deliveryDeparture: deliveryDeparture ? new Date(deliveryDeparture) : undefined,
        deliveryReturn: deliveryReturn ? new Date(deliveryReturn) : undefined,
        notes,
        createdBy: session.user.id,
        createdByName: session.user.name,
      }], { session: mongoSession });

      if (!isShopSale) {
        customer.balance = balanceAfter;
        await customer.save({ session: mongoSession });
      }

      await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'Sale', entityId: sale[0]._id, after: sale[0], session: mongoSession });

      createdSale = sale[0];
    });

    return NextResponse.json({ success: true, data: createdSale }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  } finally {
    await mongoSession.endSession();
  }
}
