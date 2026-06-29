import mongoose from 'mongoose';

const CustomerPaymentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'transfer', 'pos', 'cheque'], required: true },
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

export default mongoose.models.CustomerPayment || mongoose.model('CustomerPayment', CustomerPaymentSchema);
