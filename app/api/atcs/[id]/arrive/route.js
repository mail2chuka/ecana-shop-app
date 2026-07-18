import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ATC from '@/models/ATC';
import { logAudit } from '@/lib/audit';
import { can } from '@/lib/permissions';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !can(session.user.role, 'atcs.arrive')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const atc = await ATC.findById(id);
    if (!atc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!atc.assignedTruck) return NextResponse.json({ error: 'Assign a truck first' }, { status: 400 });
    if (atc.status === 'closed') return NextResponse.json({ error: 'ATC is already closed' }, { status: 400 });
    if (atc.bagsRemaining <= 0) return NextResponse.json({ error: `ATC ${atc.atcNumber} has no bags remaining — it should be closed, not marked arrived` }, { status: 400 });
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
