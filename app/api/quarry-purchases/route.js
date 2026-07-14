import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import QuarryPurchase from '@/models/QuarryPurchase';
import Supplier from '@/models/Supplier';
import StoneDustProduct from '@/models/StoneDustProduct';
import Truck from '@/models/Truck';
import ATC from '@/models/ATC';
import { logAudit } from '@/lib/audit';

async function generateReferenceNumber() {
  for (let i = 0; i < 10; i++) {
    const candidate = String(Math.floor(10000000 + Math.random() * 90000000));
    const exists = await QuarryPurchase.findOne({ referenceNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Could not generate a unique reference number, please try again');
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const quarry = searchParams.get('quarry');
    const product = searchParams.get('product');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const query = {};
    if (quarry) query.quarry = quarry;
    if (product) query.stoneDustProduct = product;
    if (availableOnly) query.tonnesRemaining = { $gt: 0 };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const purchases = await QuarryPurchase.find(query).sort({ date: -1 });
    return NextResponse.json({ success: true, data: purchases });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    const { quarry, stoneDustProduct, truck, tonnage, date } = body;
    if (!quarry || !stoneDustProduct || !truck || !tonnage) {
      return NextResponse.json({ error: 'Quarry, product, truck and tonnage are required' }, { status: 400 });
    }
    const tonnageNum = Number(tonnage);
    if (!(tonnageNum > 0)) return NextResponse.json({ error: 'Tonnage must be greater than 0' }, { status: 400 });

    const quarrySupplier = await Supplier.findById(quarry);
    if (!quarrySupplier || quarrySupplier.type !== 'quarry') {
      return NextResponse.json({ error: 'Invalid quarry' }, { status: 400 });
    }
    const product = await StoneDustProduct.findById(stoneDustProduct);
    if (!product || String(product.quarry) !== String(quarry)) {
      return NextResponse.json({ error: 'Invalid product for this quarry' }, { status: 400 });
    }
    const truckDoc = await Truck.findById(truck);
    if (!truckDoc) return NextResponse.json({ error: 'Invalid truck' }, { status: 400 });
    if (truckDoc.type !== 'stonedust') {
      return NextResponse.json({ error: `${truckDoc.plateNumber} is registered for cement, not aggregates — assign an aggregate truck instead` }, { status: 400 });
    }

    const busyOn = await QuarryPurchase.findOne({ truck: truckDoc._id, tonnesRemaining: { $gt: 0 } });
    if (busyOn) {
      return NextResponse.json({ error: `Truck ${truckDoc.plateNumber} is still carrying reference ${busyOn.referenceNumber} (${busyOn.tonnesRemaining}t remaining) — it must be fully supplied before assigning a new reference` }, { status: 400 });
    }

    const busyOnAtc = await ATC.findOne({ assignedTruck: truckDoc._id, status: { $in: ['assigned', 'loaded', 'collecting'] } });
    if (busyOnAtc) {
      return NextResponse.json({ error: `Truck ${truckDoc.plateNumber} is still out on ATC ${busyOnAtc.atcNumber} — it'll be free once that one arrives or closes` }, { status: 400 });
    }

    const costPricePerTonne = product.currentPricePerTonne || 0;
    const referenceNumber = await generateReferenceNumber();

    const purchase = await QuarryPurchase.create({
      referenceNumber,
      quarry: quarrySupplier._id,
      quarryName: quarrySupplier.name,
      stoneDustProduct: product._id,
      size: product.size,
      truck: truckDoc._id,
      truckPlate: truckDoc.plateNumber,
      driverName: truckDoc.driverName,
      tonnage: tonnageNum,
      tonnesRemaining: tonnageNum,
      costPricePerTonne,
      totalCost: tonnageNum * costPricePerTonne,
      date: date ? new Date(date) : new Date(),
      createdBy: session.user.id,
      createdByName: session.user.name,
    });

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'QuarryPurchase', entityId: purchase._id, after: purchase });
    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
