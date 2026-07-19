/**
 * ONE-TIME migration: convert the single-tenant Ecana database into the multi-tenant substrate.
 *
 *   1. Create (or reuse) the founding "Ecana Family Limited" organization (freeForever).
 *   2. Stamp every existing document in every collection with that organization.
 *   3. Swap the 8 global unique indexes for per-org compound ones (User email/username/phone stay global).
 *
 * SAFE TO RE-RUN: it backfills only docs missing `organization`, and index ops are tolerant of
 * already-applied state. TAKE A `mongodump` BACKUP FIRST. Run with:  node scripts/migrate_to_multitenant.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const TENANT_COLLECTIONS = [
  'users', 'customers', 'sales', 'atcs', 'trucks', 'cementbrands', 'stonedustproducts',
  'suppliers', 'quarrypurchases', 'shopproducts', 'customerpayments', 'auditlogs', 'pricehistories',
];

// old global unique index name -> the collection it's on. These become per-org compound indexes.
const OLD_UNIQUE_INDEXES = [
  ['customers', 'customerId_1'],
  ['sales', 'saleNumber_1'],
  ['sales', 'transactionNumber_1'],
  ['atcs', 'atcNumber_1'],
  ['atcs', 'transactionNumber_1'],
  ['trucks', 'plateNumber_1'],
  ['quarrypurchases', 'referenceNumber_1'],
  ['customerpayments', 'transactionNumber_1'],
];

async function dropIfExists(coll, indexName) {
  try {
    await coll.dropIndex(indexName);
    console.log(`  dropped ${coll.collectionName}.${indexName}`);
  } catch (e) {
    if (/index not found|IndexNotFound|ns not found/i.test(e.message)) {
      console.log(`  (already gone) ${coll.collectionName}.${indexName}`);
    } else throw e;
  }
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Founding org
  const orgs = db.collection('organizations');
  let ecana = await orgs.findOne({ slug: 'ecana' });
  if (!ecana) {
    const res = await orgs.insertOne({
      name: 'Ecana Family Limited',
      slug: 'ecana',
      enabledModules: ['cement', 'aggregate', 'shop'],
      subscriptionStatus: 'active',
      freeForever: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ecana = { _id: res.insertedId };
    console.log('created Ecana organization', ecana._id.toString());
  } else {
    console.log('reusing existing Ecana organization', ecana._id.toString());
  }
  const orgId = ecana._id;

  // 2. Backfill organization on every existing doc
  for (const name of TENANT_COLLECTIONS) {
    const coll = db.collection(name);
    const res = await coll.updateMany({ organization: { $exists: false } }, { $set: { organization: orgId } });
    console.log(`backfilled ${name}: ${res.modifiedCount} docs`);
  }

  // 3. Swap indexes: drop old global uniques, create per-org compound ones
  console.log('dropping old global unique indexes...');
  for (const [name, indexName] of OLD_UNIQUE_INDEXES) {
    await dropIfExists(db.collection(name), indexName);
  }

  console.log('creating per-org compound indexes (drop-then-create, idempotent)...');
  // transactionNumber indexes are partial (unique when present) because a few legacy records have null.
  const partialStr = (field) => ({ unique: true, partialFilterExpression: { [field]: { $type: 'string' } } });
  const plainUnique = { unique: true };
  const NEW_INDEXES = [
    ['customers', { organization: 1, customerId: 1 }, partialStr('customerId')],
    ['sales', { organization: 1, saleNumber: 1 }, plainUnique],
    ['sales', { organization: 1, transactionNumber: 1 }, partialStr('transactionNumber')],
    ['atcs', { organization: 1, atcNumber: 1 }, plainUnique],
    ['atcs', { organization: 1, transactionNumber: 1 }, partialStr('transactionNumber')],
    ['trucks', { organization: 1, plateNumber: 1 }, plainUnique],
    ['quarrypurchases', { organization: 1, referenceNumber: 1 }, plainUnique],
    ['customerpayments', { organization: 1, transactionNumber: 1 }, partialStr('transactionNumber')],
  ];
  for (const [coll, key, opts] of NEW_INDEXES) {
    const c = db.collection(coll);
    const name = Object.entries(key).map(([k, v]) => `${k}_${v}`).join('_');
    await dropIfExists(c, name); // so a re-run recreates with current options
    await c.createIndex(key, opts);
    console.log(`  created ${coll}.${name}`);
  }
  console.log('  done');

  await mongoose.disconnect();
  console.log('MIGRATION COMPLETE');
})().catch(e => { console.error('MIGRATION FAILED:', e); process.exit(1); });
