/**
 * ONE-TIME migration: CustomerPayment.notes -> description, drop the unused reference field.
 *
 * SAFE TO RE-RUN: only touches docs that still have the old `notes` field.
 * Run with:  node scripts/migrate_payment_description.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const payments = mongoose.connection.db.collection('customerpayments');

  const cursor = payments.find({ notes: { $exists: true } });
  let n = 0;
  while (await cursor.hasNext()) {
    const p = await cursor.next();
    await payments.updateOne(
      { _id: p._id },
      { $set: { description: p.notes }, $unset: { notes: '', reference: '' } }
    );
    n++;
  }
  // Also drop the now-unused reference field on any payment that never had notes.
  const refOnly = await payments.updateMany({ reference: { $exists: true } }, { $unset: { reference: '' } });

  console.log(`migrated ${n} payment(s) notes -> description`);
  console.log(`dropped reference field on ${refOnly.modifiedCount} additional payment(s)`);

  await mongoose.disconnect();
})().catch(e => { console.error('MIGRATION FAILED:', e); process.exit(1); });
