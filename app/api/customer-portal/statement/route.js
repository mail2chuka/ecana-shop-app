import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { buildCustomerStatement } from '@/lib/customerStatement';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'customer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user.linkedCustomer) return NextResponse.json({ error: 'No customer profile linked to this login' }, { status: 400 });
    await dbConnect();
    const result = await buildCustomerStatement(session.user.linkedCustomer);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
