import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

async function _h_GET() {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const org = await Organization.findById(session.user.organization).select('name slug logoUrl address invoiceFooter');
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: org });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function _h_PUT(request) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const body = await request.json();
    const update = {};
    if (typeof body.name === 'string') {
      if (!body.name.trim()) throw new ApiError('Business name is required', 400);
      update.name = body.name.trim();
    }
    if (typeof body.logoUrl === 'string') update.logoUrl = body.logoUrl.trim() || null;
    if (typeof body.address === 'string') update.address = body.address.trim() || null;
    if (typeof body.invoiceFooter === 'string') update.invoiceFooter = body.invoiceFooter.trim() || null;

    const before = await Organization.findById(session.user.organization).select('name logoUrl address invoiceFooter').lean();
    if (!before) throw new ApiError('Organization not found', 404);
    const updated = await Organization.findByIdAndUpdate(session.user.organization, update, { new: true, runValidators: true })
      .select('name slug logoUrl address invoiceFooter');

    await logAudit({
      userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'Organization', entityId: session.user.organization,
      before, after: { name: updated.name, logoUrl: updated.logoUrl, address: updated.address, invoiceFooter: updated.invoiceFooter },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = withOrg(_h_GET);
export const PUT = withOrg(_h_PUT);
