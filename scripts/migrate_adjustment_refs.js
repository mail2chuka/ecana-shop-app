/**
 * ONE-TIME migration: backfill Sale.adjustments[].referenceNumber for surcharges/refunds recorded
 * before reference numbers existed on adjustments. Uses each adjustment's own historical `appliedAt`
 * date (not today) so the ref's date prefix reflects when it actually happened, drawing from the same
 * per-org daily `txnRef:<YYMMDD>` counter every other transaction type (sale/payment/ATC/quarry) uses —
 * so it continues that day's sequence rather than colliding with it.
 *
 * SAFE TO RE-RUN: only touches adjustments still missing a referenceNumber.
 * Run with:  node scripts/migrate_adjustment_refs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const BASE_WIDTH = 3;

function dateKey(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

async function nextRef(counters, orgId, date) {
  const key = `txnRef:${dateKey(date)}`;
  await counters.updateOne({ organization: orgId, key }, { $inc: { seq: 1 } }, { upsert: true });
  const counter = await counters.findOne({ organization: orgId, key });

  let width = BASE_WIDTH;
  let cap = 10 ** width - 1;
  let n = counter.seq;
  while (n > cap) { n -= cap; width += 1; cap = 10 ** width - 1; }
  return `${dateKey(date)}${String(n).padStart(width, '0')}`;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const sales = db.collection('sales');
  const counters = db.collection('counters');

  const todo = [];
  const cursor = sales.find({ 'adjustments.0': { $exists: true } });
  while (await cursor.hasNext()) {
    const s = await cursor.next();
    for (const adj of s.adjustments || []) {
      if (!adj.referenceNumber) {
        todo.push({ saleId: s._id, saleNumber: s.saleNumber, orgId: s.organization, adjId: adj._id, appliedAt: adj.appliedAt || s.updatedAt || s.createdAt });
      }
    }
  }

  // Chronological order so same-day refs come out in the order things actually happened.
  todo.sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt));

  for (const item of todo) {
    const referenceNumber = await nextRef(counters, item.orgId, new Date(item.appliedAt));
    await sales.updateOne(
      { _id: item.saleId, 'adjustments._id': item.adjId },
      { $set: { 'adjustments.$.referenceNumber': referenceNumber } }
    );
    console.log(`${item.saleNumber} adjustment ${item.adjId} -> ${referenceNumber}`);
  }
  console.log(`done, backfilled ${todo.length} adjustment reference number(s)`);

  await mongoose.disconnect();
})().catch(e => { console.error('MIGRATION FAILED:', e); process.exit(1); });
