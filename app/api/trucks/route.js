import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Truck from '@/models/Truck';
import ATC from '@/models/ATC';
import QuarryPurchase from '@/models/QuarryPurchase';
import { logAudit } from '@/lib/audit';

const QUARRY_TRUCK_LOCK_MS = 30 * 60 * 1000;

async function _h_GET() {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const trucks = await Truck.find({ isActive: true }).sort({ plateNumber: 1 });
    const truckIds = trucks.map(t => t._id);
    const busyCutoff = new Date(Date.now() - QUARRY_TRUCK_LOCK_MS);

    const [busyAtcs, busyPurchases] = await Promise.all([
      ATC.find({ assignedTruck: { $in: truckIds }, status: { $ne: 'closed' } }),
      QuarryPurchase.find({ truck: { $in: truckIds }, createdAt: { $gte: busyCutoff } }),
    ]);

    const data = trucks.map(t => {
      const atc = busyAtcs.find(a => String(a.assignedTruck) === String(t._id));
      const purchase = busyPurchases.find(p => String(p.truck) === String(t._id));
      let busyReason = null;
      if (atc) busyReason = `On ATC ${atc.atcNumber} (${atc.bagsRemaining} bags remaining)`;
      else if (purchase) busyReason = `On aggregate delivery (ref ${purchase.referenceNumber})`;
      return { ...t.toObject(), busy: !!busyReason, busyReason };
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function _h_POST(request) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    if (!body.plateNumber || !body.driverName) return NextResponse.json({ error: 'Plate number and driver name required' }, { status: 400 });
    const exists = await Truck.findOne({ plateNumber: body.plateNumber.toUpperCase() });
    if (exists) return NextResponse.json({ error: 'Plate number already exists' }, { status: 400 });
    const truck = await Truck.create({ ...body, createdBy: session.user.id });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'Truck', entityId: truck._id, after: truck });
    return NextResponse.json({ success: true, data: truck }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export const GET = withOrg(_h_GET);
export const POST = withOrg(_h_POST);
