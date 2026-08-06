import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import Sale from '@/models/Sale';
import ATC from '@/models/ATC';
import Customer from '@/models/Customer';
import Truck from '@/models/Truck';
import StoneDustProduct from '@/models/StoneDustProduct';
import QuarryPurchase from '@/models/QuarryPurchase';
import ShopProduct from '@/models/ShopProduct';
import CementBrand from '@/models/CementBrand';
import { logAudit } from '@/lib/audit';
import { generateTransactionNumber } from '@/lib/transaction';
import { isShopCustomer, isWalkInCustomer } from '@/lib/shopStock';
import { resolveDate } from '@/lib/dayLock';
import { hasModule, moduleForSaleType } from '@/lib/modules';
import { verifyOwnPin } from '@/lib/verifyPassword';
import { ApiError } from '@/lib/apiError';
import { pluralizeUnit } from '@/lib/format';
import { readJsonBody } from '@/lib/requestBody';

async function _h_GET(request, { params }) {
  try {
    const session = await getOrgSession();
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

async function _h_DELETE(request, { params }) {
  const session = await getOrgSession();
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
      const customer = await Customer.findById(sale.customer).session(mongoSession);
      const wasCreditSale = sale.saleType !== 'shop' || sale.paymentMethod === 'balance';
      if (wasCreditSale && customer) {
        customer.balance += sale.grandTotal;
        // Any surcharge/refund layered on top of this sale also moved balance independently —
        // deleting the sale (and its embedded adjustments with it) must undo those too, or the
        // customer is left with a permanent, invisible drift equal to the net adjustment amount.
        for (const adj of sale.adjustments || []) {
          customer.balance += adj.type === 'surcharge' ? adj.amount : -adj.amount;
        }
        await customer.save({ session: mongoSession });
      }

      for (const item of sale.items) {
        if (item.itemType === 'cement' && item.atc) {
          const atc = await ATC.findById(item.atc).session(mongoSession);
          if (atc) {
            atc.bagsRemaining += item.actualQuantity;
            if (atc.status === 'closed' && atc.bagsRemaining > 0) {
              atc.status = 'arrived';
              atc.closedDate = undefined;
            }
            await atc.save({ session: mongoSession });
          }
          if (isShopCustomer(customer)) {
            const shopProduct = await ShopProduct.findOne({ cementBrand: item.cementBrand }).session(mongoSession);
            if (shopProduct) {
              shopProduct.stockQuantity = Math.max(0, shopProduct.stockQuantity - item.actualQuantity);
              await shopProduct.save({ session: mongoSession });
            }
          }
        } else if (item.itemType === 'stonedust' && item.quarryPurchase) {
          // Each stonedust item's purchase record only exists to mirror that sale — remove it with the sale.
          await QuarryPurchase.deleteOne({ _id: item.quarryPurchase }).session(mongoSession);
        } else if (item.itemType === 'shop' && item.shopProduct) {
          const product = await ShopProduct.findById(item.shopProduct).session(mongoSession);
          if (product) {
            product.stockQuantity += item.actualQuantity;
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

async function _h_PUT(request, { params }) {
  const session = await getOrgSession();
  // Editing a recorded transaction is admin-only and PIN-gated, same as surcharge/refund — a plain
  // "sales.edit" permission is no longer enough on its own.
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;
  const body = await readJsonBody(request);
  const { items, discount, transportFee, date, notes, truck: truckId, paymentMethod, confirmPin } = body;

  const pinResult = await verifyOwnPin(session.user.id, confirmPin);
  if (pinResult === 'no_pin_set') {
    return NextResponse.json({ error: 'Set your 4-digit PIN first, under Users' }, { status: 400 });
  }
  if (pinResult !== 'ok') {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 400 });
  }

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
      if (!hasModule(session, moduleForSaleType(sale.saleType)) || items.some((item) => !hasModule(session, moduleForSaleType(item.itemType)))) {
        throw new ApiError('This sale type is not enabled for your organization', 403);
      }

      const isShopSale = sale.saleType === 'shop';
      if (isShopSale && !['cash', 'transfer', 'pos', 'cheque', 'balance'].includes(paymentMethod)) {
        throw new ApiError('Payment method required for shop sales', 400);
      }

      const customer = await Customer.findById(sale.customer).session(mongoSession);
      if (!customer) throw new ApiError('Customer not found', 404);

      if (isShopSale && paymentMethod === 'balance' && isWalkInCustomer(customer)) {
        throw new ApiError('Walk-in sales must be paid immediately — select a recorded customer to move this to their account', 400);
      }

      // Whether the sale's *current* (pre-edit) state moved balance — used below to undo it.
      const wasCreditSale = !isShopSale || sale.paymentMethod === 'balance';
      // Whether the sale's *edited* state will move balance — a shop sale can toggle between
      // cash and credit on edit, same as choosing it fresh at creation time.
      const willBeCreditSale = !isShopSale || paymentMethod === 'balance';

      // --- Reverse the sale's original effects on stock/balance ---
      for (const oldItem of sale.items) {
        if (oldItem.itemType === 'cement' && oldItem.atc) {
          const atc = await ATC.findById(oldItem.atc).session(mongoSession);
          if (atc) {
            atc.bagsRemaining += oldItem.actualQuantity;
            if (atc.status === 'closed' && atc.bagsRemaining > 0) {
              atc.status = 'arrived';
              atc.closedDate = undefined;
            }
            await atc.save({ session: mongoSession });
          }
          if (isShopCustomer(customer)) {
            const shopProduct = await ShopProduct.findOne({ cementBrand: oldItem.cementBrand }).session(mongoSession);
            if (shopProduct) {
              shopProduct.stockQuantity = Math.max(0, shopProduct.stockQuantity - oldItem.actualQuantity);
              await shopProduct.save({ session: mongoSession });
            }
          }
        } else if (oldItem.itemType === 'stonedust' && oldItem.quarryPurchase) {
          // Each stonedust item's purchase record only exists to mirror that sale item — it gets
          // replaced with a fresh one (fresh reference included) in the reapply loop below.
          await QuarryPurchase.deleteOne({ _id: oldItem.quarryPurchase }).session(mongoSession);
        } else if (oldItem.itemType === 'shop' && oldItem.shopProduct) {
          const product = await ShopProduct.findById(oldItem.shopProduct).session(mongoSession);
          if (product) {
            product.stockQuantity += oldItem.actualQuantity;
            await product.save({ session: mongoSession });
          }
        }
      }

      if (wasCreditSale) {
        customer.balance += sale.grandTotal;
      }

      let truckDoc = null;
      if (truckId) {
        truckDoc = await Truck.findById(truckId).session(mongoSession);
      }

      // --- Re-validate and apply the edited items ---
      const processedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const actualQty = Number(item.actualQuantity);
        const billQty = Number(item.billQuantity || item.actualQuantity);
        const unitPrice = Number(item.unitPrice);
        if (billQty <= 0 || unitPrice < 0) throw new ApiError('Invalid quantity or price in items', 400);
        const lineTotal = billQty * unitPrice;

        if (item.itemType === 'cement') {
          if (!item.atc) throw new ApiError('Cement item must reference an ATC', 400);
          const atc = await ATC.findById(item.atc).session(mongoSession);
          if (!atc) throw new ApiError('ATC not found', 404);
          if (atc.status === 'closed') throw new ApiError(`ATC ${atc.atcNumber} is closed`, 400);
          if (actualQty > atc.bagsRemaining) {
            throw new ApiError(`Only ${atc.bagsRemaining} ${pluralizeUnit(atc.bagsRemaining, 'bag')} remaining on ATC ${atc.atcNumber}`, 400);
          }
          atc.bagsRemaining -= actualQty;
          if (atc.bagsRemaining === 0) {
            atc.status = 'closed';
            atc.closedDate = date ? resolveDate(date) : sale.date;
          }
          await atc.save({ session: mongoSession });

          if (isShopCustomer(customer)) {
            let shopProduct = await ShopProduct.findOne({ cementBrand: atc.cementBrand }).session(mongoSession);
            if (!shopProduct) {
              const created = await ShopProduct.create([{
                name: atc.cementBrandName?.trim() || 'Cement',
                unit: 'bag',
                price: unitPrice,
                stockQuantity: 0,
                cementBrand: atc.cementBrand,
                createdBy: session.user.id,
                createdByName: session.user.name,
              }], { session: mongoSession });
              shopProduct = created[0];
            }
            shopProduct.stockQuantity += actualQty;
            await shopProduct.save({ session: mongoSession });
          }

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

          if (!truckDoc) throw new ApiError('Truck required for aggregate sales', 400);
          if (truckDoc.type !== 'stonedust') {
            throw new ApiError(`${truckDoc.plateNumber} is registered for cement, not aggregates — assign an aggregate truck instead`, 400);
          }
          const costPricePerTonne = product.currentPricePerTonne || 0;
          const referenceNumber = await generateTransactionNumber(mongoSession);
          const purchase = await QuarryPurchase.create([{
            referenceNumber,
            quarry: product.quarry,
            quarryName: product.quarryName,
            stoneDustProduct: product._id,
            size: product.size,
            truck: truckDoc._id,
            truckPlate: truckDoc.plateNumber,
            driverName: truckDoc.driverName,
            tonnage: actualQty,
            tonnesRemaining: 0,
            costPricePerTonne,
            totalCost: actualQty * costPricePerTonne,
            sale: sale._id,
            date: date ? resolveDate(date) : sale.date,
            createdBy: session.user.id,
            createdByName: session.user.name,
          }], { session: mongoSession });

          processedItems.push({
            itemType: 'stonedust',
            stoneDustProduct: product._id,
            quarryName: product.quarryName,
            size: product.size,
            quarryPurchase: purchase[0]._id,
            quarryPurchaseRef: purchase[0].referenceNumber,
            billQuantity: billQty,
            actualQuantity: actualQty,
            unitPrice,
            lineTotal,
          });
        } else if (item.itemType === 'shop') {
          if (!item.shopProduct) throw new ApiError('Shop item must reference a product', 400);
          const product = await ShopProduct.findById(item.shopProduct).session(mongoSession);
          if (!product) throw new ApiError('Shop product not found', 404);
          if (actualQty > product.stockQuantity) {
            throw new ApiError(`Only ${product.stockQuantity} ${product.unit}(s) of ${product.name} in stock`, 400);
          }
          product.stockQuantity -= actualQty;
          await product.save({ session: mongoSession });

          let cementBrandName;
          if (product.cementBrand) {
            const brand = await CementBrand.findById(product.cementBrand).session(mongoSession);
            cementBrandName = brand?.name;
          }

          processedItems.push({
            itemType: 'shop',
            shopProduct: product._id,
            shopProductName: product.name,
            cementBrand: product.cementBrand,
            cementBrandName,
            unit: product.unit,
            billQuantity: billQty,
            actualQuantity: actualQty,
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
      const balanceAfter = willBeCreditSale ? balanceBefore - grandTotal : balanceBefore;

      if (willBeCreditSale && customer.creditLimit !== null && customer.creditLimit !== undefined) {
        if (balanceAfter < -customer.creditLimit) {
          throw new ApiError(`Credit limit exceeded. Customer can owe up to ₦${customer.creditLimit.toLocaleString()}.`, 400);
        }
      }

      const truckData = truckDoc
        ? { truck: truckDoc._id, truckPlate: truckDoc.plateNumber, driverName: truckDoc.driverName }
        : { truck: undefined, truckPlate: undefined, driverName: undefined };

      const before = sale.toObject();

      sale.items = processedItems;
      sale.subtotal = subtotal;
      sale.discount = disc;
      sale.transportFee = transport;
      sale.grandTotal = grandTotal;
      sale.balanceBefore = balanceBefore;
      sale.balanceAfter = balanceAfter;
      sale.date = date ? resolveDate(date) : sale.date;
      sale.notes = notes;
      sale.truck = truckData.truck;
      sale.truckPlate = truckData.truckPlate;
      sale.driverName = truckData.driverName;
      if (isShopSale) sale.paymentMethod = paymentMethod;
      sale.editedAt = new Date();
      sale.editedBy = session.user.id;
      sale.editedByName = session.user.name;
      await sale.save({ session: mongoSession });

      if (willBeCreditSale) {
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

export const GET = withOrg(_h_GET);
export const PUT = withOrg(_h_PUT);
export const DELETE = withOrg(_h_DELETE);
