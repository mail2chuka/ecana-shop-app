import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const CustomerPaymentSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  transactionNumber: { type: String, required: true }, // unique per-org (compound index below)
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'transfer', 'pos', 'cheque'], required: true },
  depositorName: { type: String, required: true },
  bankName: { type: String, required: true },
  reference: String,
  date: { type: Date, default: Date.now },
  balanceBefore: Number,
  balanceAfter: Number,
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: String,
}, { timestamps: true });

CustomerPaymentSchema.index({ customer: 1, date: -1 });
CustomerPaymentSchema.index({ date: -1 });
// transactionNumber is partial (unique when present): a few legacy records predate the field.
CustomerPaymentSchema.index({ organization: 1, transactionNumber: 1 }, { unique: true, partialFilterExpression: { transactionNumber: { $type: 'string' } } });

CustomerPaymentSchema.plugin(tenantPlugin);

export default mongoose.models.CustomerPayment || mongoose.model('CustomerPayment', CustomerPaymentSchema);
