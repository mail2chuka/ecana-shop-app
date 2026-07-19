import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import AuditLog from '@/models/AuditLog';

async function _h_GET(request) {
  try {
    const session = await getOrgSession();
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const userId = searchParams.get('user');

    const query = {};
    if (entity) query.entity = entity;
    if (userId) query.userId = userId;

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json({ success: true, data: logs });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const GET = withOrg(_h_GET);
