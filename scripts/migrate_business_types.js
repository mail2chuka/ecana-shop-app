/**
 * ONE-TIME migration: Organization.businessType (single string) -> businessTypes (array).
 *
 * SAFE TO RE-RUN: only touches docs that still have the old `businessType` field.
 * Run with:  node scripts/migrate_business_types.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const orgs = mongoose.connection.db.collection('organizations');

  const cursor = orgs.find({ businessType: { $exists: true } });
  let n = 0;
  while (await cursor.hasNext()) {
    const org = await cursor.next();
    await orgs.updateOne(
      { _id: org._id },
      { $set: { businessTypes: [org.businessType] }, $unset: { businessType: '' } }
    );
    console.log(`migrated ${org.name || org._id}: businessType "${org.businessType}" -> businessTypes ["${org.businessType}"]`);
    n++;
  }
  console.log(`done, migrated ${n} organization(s)`);

  await mongoose.disconnect();
})().catch(e => { console.error('MIGRATION FAILED:', e); process.exit(1); });
