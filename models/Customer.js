import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const CustomerSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  customerId: { type: String }, // unique per-org (compound partial index below), not globally
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: String,
  businessName: String,
  balance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: null }, // null = no limit
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

CustomerSchema.index({ name: 'text', phone: 'text', businessName: 'text' });
CustomerSchema.index({ isActive: 1 });
// customerId unique within an org, only when present (partial — a compound sparse index would not
// skip nulls because organization is always set).
CustomerSchema.index(
  { organization: 1, customerId: 1 },
  { unique: true, partialFilterExpression: { customerId: { $type: 'string' } } }
);

CustomerSchema.plugin(tenantPlugin);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
