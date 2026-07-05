import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CementBrand from '@/models/CementBrand';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const brands = await CementBrand.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json({ success: true, data: brands });
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
    if (!body.name) return NextResponse.json({ error: 'Brand name required' }, { status: 400 });

    const brand = await CementBrand.create({
      name: body.name,
      abbreviation: body.abbreviation,
      grade: body.grade,
      bagSize: body.bagSize || 50,
      currentPricePerBag: Number(body.currentPricePerBag) || 0,
      depotName: body.depot || null,
      createdBy: session.user.id,
    });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'CementBrand', entityId: brand._id, after: brand });
    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
