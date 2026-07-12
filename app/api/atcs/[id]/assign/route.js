import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ATC from '@/models/ATC';
import Truck from '@/models/Truck';
import { logAudit } from '@/lib/audit';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const { truckId } = await request.json();
    if (!truckId) return NextResponse.json({ error: 'Truck required' }, { status: 400 });

    const atc = await ATC.findById(id);
    if (!atc) return NextResponse.json({ error: 'ATC not found' }, { status: 404 });
    if (atc.status === 'closed') return NextResponse.json({ error: 'ATC is closed' }, { status: 400 });

    const truck = await Truck.findById(truckId);
    if (!truck) return NextResponse.json({ error: 'Truck not found' }, { status: 404 });

    const busyOn = await ATC.findOne({ _id: { $ne: id }, assignedTruck: truck._id, status: 'assigned' });
    if (busyOn) {
      return NextResponse.json({ error: `Truck ${truck.plateNumber} is still out on ATC ${busyOn.atcNumber} — it'll be free once that one arrives or closes` }, { status: 400 });
    }

    atc.assignedTruck = truck._id;
    atc.assignedTruckPlate = truck.plateNumber;
    atc.assignedDriverName = truck.driverName;
    if (!atc.assignedDate) atc.assignedDate = new Date();
    if (atc.status === 'pending') atc.status = 'assigned';
    await atc.save();

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'assigned_truck', entity: 'ATC', entityId: id, after: { truck: truck.plateNumber } });
    return NextResponse.json({ success: true, data: atc });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
