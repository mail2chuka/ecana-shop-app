import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import { put, del } from '@vercel/blob';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/apiError';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

async function _h_POST(request) {
  const session = await getOrgSession();
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') throw new ApiError('No file provided', 400);
    if (!ALLOWED_TYPES.includes(file.type)) throw new ApiError('Logo must be a PNG, JPEG, WEBP, or SVG image', 400);
    if (file.size > MAX_SIZE) throw new ApiError('Logo must be smaller than 2MB', 400);

    // The small PNG variant is generated client-side (lib/imageResize.js) and sent alongside the
    // original — optional, since resizing can fail for an unusual source image and that shouldn't
    // block uploading the logo itself; ReceiptHeader falls back to the full-size logoUrl if unset.
    const smallFile = formData.get('smallFile');
    const hasSmallFile = smallFile && typeof smallFile !== 'string';

    const before = await Organization.findById(session.user.organization).select('logoUrl logoUrlSmall').lean();
    if (!before) throw new ApiError('Organization not found', 404);

    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const blob = await put(`org-logos/${session.user.organization}-${Date.now()}.${ext}`, file, { access: 'public' });

    const update = { logoUrl: blob.url };
    let smallBlob = null;
    if (hasSmallFile) {
      smallBlob = await put(`org-logos/${session.user.organization}-${Date.now()}-sm.png`, smallFile, { access: 'public' });
      update.logoUrlSmall = smallBlob.url;
    }

    await Organization.findByIdAndUpdate(session.user.organization, update);

    // Best-effort cleanup of the previous logo(s) — awaited deliberately: on Vercel's serverless
    // runtime, un-awaited "background" work can be killed the instant the response is sent, so a
    // fire-and-forget call here could silently never run in production. Still swallow errors (e.g. an
    // external URL from before this upload flow existed, which del() can't touch) rather than failing.
    if (before.logoUrl) await del(before.logoUrl).catch(() => {});
    if (before.logoUrlSmall) await del(before.logoUrlSmall).catch(() => {});

    await logAudit({
      userId: session.user.id, userName: session.user.name, action: 'updated', entity: 'Organization', entityId: session.user.organization,
      before: { logoUrl: before.logoUrl, logoUrlSmall: before.logoUrlSmall }, after: { logoUrl: blob.url, logoUrlSmall: update.logoUrlSmall || null },
    });

    return NextResponse.json({ success: true, data: { logoUrl: blob.url, logoUrlSmall: update.logoUrlSmall || null } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const POST = withOrg(_h_POST);
