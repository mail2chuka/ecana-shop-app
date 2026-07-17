import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ATC from '@/models/ATC';
import { logAudit } from '@/lib/audit';
import { requireObjectId } from '@/lib/validate';
import { LOADING_WINDOW_MS } from '@/lib/atcLifecycle';

const loadingChoices = new Set([
  'just_loaded',
  'one_hour_ago',
  'two_hours_ago',
  'three_hours_ago',
  'four_hours_ago',
  'five_hours_ago',
  'arrived',
]);

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { id } = await params;
    requireObjectId(id, 'atc id');

    const { mode } = await request.json();
    if (!loadingChoices.has(mode)) {
      return NextResponse.json({ error: 'Invalid loading option' }, { status: 400 });
    }

    const atc = await ATC.findById(id);
    if (!atc) return NextResponse.json({ error: 'ATC not found' }, { status: 404 });
    if (!atc.assignedTruck) return NextResponse.json({ error: 'Assign a truck first' }, { status: 400 });
    if (['arrived', 'closed'].includes(atc.status)) {
      return NextResponse.json({ error: `ATC ${atc.atcNumber} has already progressed past loading` }, { status: 400 });
    }

    const now = new Date();
    const offsetHours = {
      just_loaded: 0,
      one_hour_ago: 1,
      two_hours_ago: 2,
      three_hours_ago: 3,
      four_hours_ago: 4,
      five_hours_ago: 5,
    }[mode];

    if (mode === 'arrived') {
      atc.status = 'arrived';
      atc.loadedAt = new Date(now.getTime() - LOADING_WINDOW_MS);
      atc.arrivalDate = now;
    } else {
      atc.status = 'loaded';
      atc.loadedAt = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);
    }

    await atc.save();
    await logAudit({
      userId: session.user.id,
      userName: session.user.name,
      action: 'loading_updated',
      entity: 'ATC',
      entityId: id,
      after: { mode, status: atc.status, loadedAt: atc.loadedAt, deliveryDate: atc.deliveryDate },
    });

    return NextResponse.json({ success: true, data: atc });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status || 400 });
  }
}