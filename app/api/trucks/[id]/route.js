import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Truck from '@/models/Truck';
import ATC from '@/models/ATC';
import QuarryPurchase from '@/models/QuarryPurchase';
import { logAudit } from '@/lib/audit';
import { requireObjectId } from '@/lib/validate';

const QUARRY_TRUCK_LOCK_MS = 30 * 60 * 1000;

async function findBusyReason(truckId) {
  const busyAtc = await ATC.findOne({ assignedTruck: truckId, status: { $ne: 'closed' } });
  if (busyAtc) return `it's still tied to ATC ${busyAtc.atcNumber} (${busyAtc.bagsRemaining} bags remaining) — it'll be free once that closes`;
  const busyCutoff = new Date(Date.now() - QUARRY_TRUCK_LOCK_MS);
  const busyPurchase = await QuarryPurchase.findOne({ truck: truckId, createdAt: { $gte: busyCutoff } });
  if (busyPurchase) return `it's on an aggregate delivery (ref ${busyPurchase.referenceNumber}) — it'll be free 30 minutes after that sale`;
  return null;
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'truck id');
    const body = await request.json();
    const before = await Truck.findById(id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const busyReason = await findBusyReason(id);
    if (busyReason) {
      return NextResponse.json({ error: `Truck ${before.plateNumber} can't be edited — ${busyReason}` }, { status: 400 });
    }

    if (body.plateNumber) {
      const newPlate = body.plateNumber.trim().toUpperCase();
      if (newPlate !== before.plateNumber) {
        const duplicate = await Truck.findOne({ plateNumber: newPlate, _id: { $ne: id } });
        if (duplicate) return NextResponse.json({ error: `${newPlate} is already registered to another truck` }, { status: 400 });
      }
    }

    const update = {
      plateNumber: body.plateNumber ? body.plateNumber.trim().toUpperCase() : undefined,
      driverName: body.driverName,
      driverPhone: body.driverPhone,
      type: body.type,
      capacityTonnes: body.capacityTonnes !== undefined ? (body.capacityTonnes === null || body.capacityTonnes === '' ? null : Number(body.capacityTonnes)) : undefined,
      ownership: body.ownership,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    };
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    const updated = await Truck.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'Truck', entityId: id, before, after: updated });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    requireObjectId(id, 'truck id');
    const updated = await Truck.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'deactivated', entity: 'Truck', entityId: id });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}
