import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ATC from '@/models/ATC';
import { logAudit } from '@/lib/audit';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const atc = await ATC.findById(id);
    if (!atc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!atc.assignedTruck) return NextResponse.json({ error: 'Assign a truck first' }, { status: 400 });
    atc.status = 'arrived';
    atc.arrivalDate = new Date();
    atc.deliveryDate = atc.deliveryDate || atc.arrivalDate;
    await atc.save();
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'marked_arrived', entity: 'ATC', entityId: id });
    return NextResponse.json({ success: true, data: atc });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
