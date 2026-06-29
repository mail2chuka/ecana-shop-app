import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Supplier from '@/models/Supplier';
import { logAudit } from '@/lib/audit';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = { isActive: true };
    if (type) query.type = type;
    const suppliers = await Supplier.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, data: suppliers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const body = await request.json();
    if (!body.name || !body.type) return NextResponse.json({ error: 'Name and type required' }, { status: 400 });
    if (!['cement_depot', 'quarry'].includes(body.type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    const supplier = await Supplier.create({ ...body, createdBy: session.user.id });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'Supplier', entityId: supplier._id, after: supplier });
    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
