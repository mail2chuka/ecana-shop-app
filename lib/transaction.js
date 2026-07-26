import Counter from '@/models/Counter';

const BASE_WIDTH = 3; // 001-999/day normally — 6-digit date + 3-digit counter = 9 digits

function dateKey(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// One shared reference-number generator for every transaction type (sale, payment, ATC, quarry
// purchase) — a single per-org daily sequence, so no two transactions of any type can ever collide.
// Normal day: 6-digit date + 3-digit counter = 9 digits (001-999). If a day's 999 slots run out, the
// counter widens by a digit and restarts at 1 within that SAME day (...999 then ...0001), and keeps
// widening indefinitely if it ever needs to — never capped, never borrows tomorrow's numbers. Each
// new calendar day always starts fresh back at the 3-digit counter.
export async function generateTransactionNumber(session) {
  const key = dateKey(new Date());
  const counter = await Counter.findOneAndUpdate(
    { key: `txnRef:${key}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );

  let width = BASE_WIDTH;
  let cap = 10 ** width - 1;
  let n = counter.seq;
  while (n > cap) {
    n -= cap;
    width += 1;
    cap = 10 ** width - 1;
  }
  return `${key}${String(n).padStart(width, '0')}`;
}
