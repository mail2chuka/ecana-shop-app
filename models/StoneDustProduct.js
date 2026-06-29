import mongoose from 'mongoose';

const StoneDustProductSchema = new mongoose.Schema({
  quarry: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  quarryName: String,
  size: { type: String, required: true },
  currentPricePerTonne: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

StoneDustProductSchema.index({ quarry: 1, size: 1 });
StoneDustProductSchema.index({ isActive: 1 });

export default mongoose.models.StoneDustProduct || mongoose.model('StoneDustProduct', StoneDustProductSchema);
