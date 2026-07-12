import ATC from '@/models/ATC';

export const LOADING_WINDOW_HOURS = 6;
export const LOADING_WINDOW_MS = LOADING_WINDOW_HOURS * 60 * 60 * 1000;

export function getLoadingDeadline(loadedAt) {
  if (!loadedAt) return null;
  const loadedDate = new Date(loadedAt);
  if (Number.isNaN(loadedDate.getTime())) return null;
  return new Date(loadedDate.getTime() + LOADING_WINDOW_MS);
}

export function getLoadingRemainingMs(loadedAt, now = Date.now()) {
  const deadline = getLoadingDeadline(loadedAt);
  if (!deadline) return null;
  return deadline.getTime() - now;
}

export async function autoDeliverDueAtcs(session) {
  const cutoff = new Date(Date.now() - LOADING_WINDOW_MS);
  const dueAtcs = await ATC.find({ status: 'loaded', loadedAt: { $lte: cutoff } });

  for (const atc of dueAtcs) {
    if (atc.status !== 'loaded') continue;
    atc.status = 'delivered';
    atc.deliveryDate = atc.deliveryDate || getLoadingDeadline(atc.loadedAt) || new Date();
    await atc.save(session ? { session } : undefined);
  }

  return dueAtcs.length;
}