import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  username: { type: String, unique: true, sparse: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true, trim: true }, // customer-role login identifier
  password: { type: String, required: true, select: false }, // also doubles as the PIN for customer-role accounts
  role: { type: String, enum: ['admin', 'gsm_manager', 'atc_manager', 'customer'], required: true, default: 'admin' },
  linkedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
