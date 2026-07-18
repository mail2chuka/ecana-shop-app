import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyOwnPassword } from '@/lib/verifyPassword';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { currentPassword, newPin } = await request.json();

  if (!/^\d{4}$/.test(newPin || '')) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
  }
  if (!(await verifyOwnPassword(session.user.id, currentPassword))) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 400 });
  }

  const user = await User.findById(session.user.id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  user.actionPin = newPin;
  await user.save();

  return NextResponse.json({ success: true });
}
