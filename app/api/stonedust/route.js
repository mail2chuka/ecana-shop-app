import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import StoneDustProduct from '@/models/StoneDustProduct';
import Supplier from '@/models/Supplier';
import { logAudit } from '@/lib/audit';

async function _h_GET() {
  try {
    const session = await getOrgSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const products = await StoneDustProduct.find({ isActive: true }).sort({ quarryName: 1, size: 1 });
    return NextResponse.json({ success: true, data: products });
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
    if (!body.quarry || !body.size) return NextResponse.json({ error: 'Quarry and size required' }, { status: 400 });
    const quarry = await Supplier.findById(body.quarry);
    if (!quarry || quarry.type !== 'quarry') return NextResponse.json({ error: 'Invalid quarry' }, { status: 400 });
    const product = await StoneDustProduct.create({
      quarry: body.quarry,
      quarryName: quarry.name,
      size: body.size,
      currentPricePerTonne: Number(body.currentPricePerTonne) || 0,
      createdBy: session.user.id,
    });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'StoneDustProduct', entityId: product._id, after: product });
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export const GET = withOrg(_h_GET);
export const POST = withOrg(_h_POST);
