import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyOwnPassword } from '@/lib/verifyPassword';

async function _h_POST(request) {
  const session = await getOrgSession();
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

export const POST = withOrg(_h_POST);
