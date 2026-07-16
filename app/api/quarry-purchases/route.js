import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import QuarryPurchase from '@/models/QuarryPurchase';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const quarry = searchParams.get('quarry');
    const product = searchParams.get('product');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query = {};
    if (quarry) query.quarry = quarry;
    if (product) query.stoneDustProduct = product;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const purchases = await QuarryPurchase.find(query).sort({ date: -1 });
    return NextResponse.json({ success: true, data: purchases });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
