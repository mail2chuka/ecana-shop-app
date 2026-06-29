import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, unique: true, sparse: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'staff', 'customer'], required: true, default: 'admin' },
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
