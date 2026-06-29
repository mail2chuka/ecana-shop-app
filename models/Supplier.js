import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['cement_depot', 'quarry'], required: true },
  address: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

SupplierSchema.index({ type: 1, isActive: 1 });

export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
