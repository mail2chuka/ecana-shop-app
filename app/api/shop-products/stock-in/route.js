import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import ShopProduct from '@/models/ShopProduct';
import { logAudit } from '@/lib/audit';
import { can } from '@/lib/permissions';

async function _h_POST(request) {
  try {
    const session = await getOrgSession();
    if (!session || !can(session.user.role, 'shop.edit')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    const { product: productId, quantity, description } = body;
    if (!productId || quantity === undefined) return NextResponse.json({ error: 'Product and quantity required' }, { status: 400 });

    const product = await ShopProduct.findById(productId);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const qty = Number(quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });

    product.stockQuantity = (product.stockQuantity || 0) + qty;
    await product.save();

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'stock_in', entity: 'ShopProduct', entityId: product._id, after: product, meta: { quantity: qty, description: description || '' } });

    return NextResponse.json({ success: true, data: product });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export const POST = withOrg(_h_POST, 'shop');
