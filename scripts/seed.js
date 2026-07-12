require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set in .env'); process.exit(1); }

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ecana.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const exists = await User.findOne({ email: ADMIN_EMAIL });
    if (exists) {
      console.log('Admin already exists.');
      console.log(`Email:    ${ADMIN_EMAIL}`);
      process.exit(0);
    }

    const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({ name: 'Admin', email: ADMIN_EMAIL, password, role: 'admin' });

    console.log('====================================');
    console.log('Admin user created successfully!');
    console.log('====================================');
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('====================================');
    console.log('\nNext steps:');
    console.log('1. Login at http://localhost:3000');
    console.log('2. Go to Setup > Suppliers — add your depots and quarries');
    console.log('3. Go to Setup > Cement Brands — add Dangote, BUA, Mangal, etc.');
    console.log('4. Go to Setup > Stone Dust — add your quarry products');
    console.log('5. Go to Setup > Trucks — register your fleet');
    console.log('6. Go to Setup > Customers — add your customers');
    console.log('7. Go to Operations > ATCs — record your first ATC');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
