import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

// Records every subscription extension for an organization, whether paid via Paystack or granted
// manually by the platform super_admin — the audit trail for "why does this org's access run until X".
const SubscriptionPaymentSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  plan: { type: String, enum: ['monthly', 'yearly'], required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['paystack', 'manual'], required: true },
  paystackReference: { type: String, unique: true, sparse: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: String,
}, { timestamps: true });

SubscriptionPaymentSchema.index({ organization: 1, createdAt: -1 });

SubscriptionPaymentSchema.plugin(tenantPlugin);

export default mongoose.models.SubscriptionPayment || mongoose.model('SubscriptionPayment', SubscriptionPaymentSchema);
