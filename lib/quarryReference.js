import Counter from '@/models/Counter';

const MAX_8_DIGIT = 99999999;

// Plain 8-digit number, per organization, atomically incrementing — never resets, never repeats.
export async function generateQuarryReferenceNumber(session) {
  const counter = await Counter.findOneAndUpdate(
    { key: 'quarryPurchaseRef' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );
  if (counter.seq > MAX_8_DIGIT) throw new Error('Quarry purchase reference numbers exhausted (max 8 digits)');
  return String(counter.seq).padStart(8, '0');
}
