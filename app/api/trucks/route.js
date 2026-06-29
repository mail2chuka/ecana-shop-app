import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Truck from '@/models/Truck';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const trucks = await Truck.find({ isActive: true }).sort({ plateNumber: 1 });
    return NextResponse.json({ success: true, data: trucks });
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
