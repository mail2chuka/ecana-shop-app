import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true, sparse: true },
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

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
