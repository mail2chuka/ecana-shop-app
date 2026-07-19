import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const StoneDustProductSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  quarry: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  quarryName: String,
  size: { type: String, required: true },
  currentPricePerTonne: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

StoneDustProductSchema.index({ quarry: 1, size: 1 });
StoneDustProductSchema.index({ isActive: 1 });

StoneDustProductSchema.plugin(tenantPlugin);

export default mongoose.models.StoneDustProduct || mongoose.model('StoneDustProduct', StoneDustProductSchema);
