import mongoose from 'mongoose';

const CustomerPaymentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  transactionNumber: { type: String, required: true, unique: true },
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

export default mongoose.models.CustomerPayment || mongoose.model('CustomerPayment', CustomerPaymentSchema);
