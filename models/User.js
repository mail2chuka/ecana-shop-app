import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantPlugin } from '@/lib/tenantScope';

const UserSchema = new mongoose.Schema({
  // Login identities (email/username/phone) stay GLOBALLY unique: one identity = one org, so the
  // login lookup can resolve a user to their tenant unambiguously on a single shared domain.
  // Not required for super_admin: that role is the platform owner, not a member of any organization.
  organization: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true,
    required: function () { return this.role !== 'super_admin'; },
  },
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  username: { type: String, unique: true, sparse: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true, trim: true }, // customer-role login identifier
  password: { type: String, required: true, select: false }, // also doubles as the PIN for customer-role accounts
  actionPin: { type: String, select: false }, // separate 4-digit PIN gating sensitive actions (e.g. surcharge/refund), admin sets/changes their own
  // super_admin: the SaaS platform owner - registers organizations and manages subscriptions across
  // all of them, distinct from any single organization's own admin (e.g. Ecana's admin is a plain
  // 'admin', nothing special).
  role: { type: String, enum: ['super_admin', 'admin', 'gsm_manager', 'atc_manager', 'auditor', 'customer'], required: true, default: 'admin' },
  linkedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified('actionPin') && this.actionPin) {
    this.actionPin = await bcrypt.hash(this.actionPin, 10);
  }
  next();
});

UserSchema.plugin(tenantPlugin);

export default mongoose.models.User || mongoose.model('User', UserSchema);
