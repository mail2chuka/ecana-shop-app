/**
 * ONE-TIME migration: fix Sale/CustomerPayment records whose `date` was collapsed to literal
 * midnight UTC by the date-only backdate picker (payments, aggregate sales) even when they were
 * really entered later the same day — see the resolveDate() fix in lib/dayLock.js, which stops this
 * happening for new records. This corrects historical ones by setting `date` to `createdAt` whenever
 * `date` is exactly midnight but `createdAt` (the real entry moment) is the same calendar day at a
 * later time — restoring the true time-of-day so old statements sort correctly.
 *
 * Does NOT touch records that were genuinely backdated to a past day (those still show midnight,
 * correctly, since no real time-of-day for that day is known) — only same-day midnight collapses.
 *
 * SAFE TO RE-RUN: once fixed, `date` no longer sits at midnight, so it's skipped on the next run.
 * Run with:  node scripts/migrate_backdated_dates.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

function isMidnightUTC(d) {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}
function sameCalendarDay(a, b) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

async function fixCollection(db, name) {
  const coll = db.collection(name);
  const cursor = coll.find({});
  let fixed = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc.date || !doc.createdAt) continue;
    const date = new Date(doc.date);
    const createdAt = new Date(doc.createdAt);
    if (isMidnightUTC(date) && sameCalendarDay(date, createdAt) && !isMidnightUTC(createdAt)) {
      await coll.updateOne({ _id: doc._id }, { $set: { date: createdAt } });
      const label = doc.saleNumber || doc.transactionNumber || doc._id.toString();
      console.log(`${name} ${label}: ${date.toISOString()} -> ${createdAt.toISOString()}`);
      fixed++;
    }
  }
  return fixed;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const salesFixed = await fixCollection(db, 'sales');
  const paymentsFixed = await fixCollection(db, 'customerpayments');

  console.log(`done — fixed ${salesFixed} sale(s), ${paymentsFixed} payment(s)`);
  await mongoose.disconnect();
})().catch(e => { console.error('MIGRATION FAILED:', e); process.exit(1); });
