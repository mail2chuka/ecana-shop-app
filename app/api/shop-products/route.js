import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ShopProduct from '@/models/ShopProduct';
import { logAudit } from '@/lib/audit';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('all') === 'true' ? {} : { isActive: true };
    const products = await ShopProduct.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, data: products });
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
    if (!body.name || body.price === undefined) return NextResponse.json({ error: 'Name and price required' }, { status: 400 });

    const product = await ShopProduct.create({
      name: body.name,
      unit: body.unit || 'unit',
      price: Number(body.price),
      stockQuantity: Number(body.stockQuantity) || 0,
      cementBrand: body.cementBrand || undefined,
      createdBy: session.user.id,
      createdByName: session.user.name,
    });
    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'ShopProduct', entityId: product._id, after: product });
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
