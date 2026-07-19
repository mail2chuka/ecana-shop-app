import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('Please define MONGODB_URI in .env');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export default async function dbConnect() {
  if (cached.conn) return cached.conn;
  // autoIndex off: indexes are owned by scripts/migrate_to_multitenant.js, not auto-built by the app.
  // (Auto-indexing in a multi-tenant app can resurrect dropped single-field uniques and race on boot.)
  if (!cached.promise) cached.promise = mongoose.connect(MONGODB_URI, { autoIndex: false }).then(m => m);
  cached.conn = await cached.promise;
  return cached.conn;
}
