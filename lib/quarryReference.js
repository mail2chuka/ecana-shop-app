import Counter from '@/models/Counter';

const MAX_PER_DAY = 99;
const MAX_DAY_ROLLOVERS = 365; // safety cap only — would need 99/day for a year straight to ever hit this

function dateKey(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// 8-digit number: YYMMDD + a 2-digit counter (01-99) for that day, per organization. If a day's 99
// slots are ever used up, the next purchase rolls forward onto the next day's numbering (starting at
// 01 there) instead of failing — in practice this business does nowhere near 99 quarry purchases in
// a single day, so this is a safety valve, not an expected path.
export async function generateQuarryReferenceNumber(session) {
  let date = new Date();
  for (let i = 0; i < MAX_DAY_ROLLOVERS; i++) {
    const key = dateKey(date);
    const counter = await Counter.findOneAndUpdate(
      { key: `quarryPurchaseRef:${key}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session },
    );
    if (counter.seq <= MAX_PER_DAY) {
      return `${key}${String(counter.seq).padStart(2, '0')}`;
    }
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }
  throw new Error('Could not generate a quarry purchase reference number');
}
