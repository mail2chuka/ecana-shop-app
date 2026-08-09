import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

// A surcharge/fund that isn't tied to any Sale — e.g. a goodwill credit, a standalone penalty,
// an opening-balance correction. Sale-tied adjustments still live in Sale.adjustments (see
// models/Sale.js); this is the parallel top-level collection for the untied case, shaped like
// CustomerPayment since it's the same kind of thing: a standalone entry that moves a customer's
// balance and needs its own reference number, not a modification of an existing document.
const CustomerAdjustmentSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  customerPhone: String,

  type: { type: String, enum: ['surcharge', 'refund'], required: true },
  referenceNumber: { type: String, required: true }, // same shared per-org daily sequence as every other transaction
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  date: { type: Date, default: Date.now },

  balanceBefore: Number,
  balanceAfter: Number,

  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appliedByName: String,
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

CustomerAdjustmentSchema.index({ customer: 1, date: -1 });
CustomerAdjustmentSchema.index({ date: -1 });
CustomerAdjustmentSchema.index({ organization: 1, referenceNumber: 1 }, { unique: true });

CustomerAdjustmentSchema.plugin(tenantPlugin);

export default mongoose.models.CustomerAdjustment || mongoose.model('CustomerAdjustment', CustomerAdjustmentSchema);
