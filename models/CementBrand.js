import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const CementBrandSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  abbreviation: { type: String, required: true, maxlength: 3, uppercase: true },
  grade: String,
  bagSize: { type: Number, default: 50 },
  currentPricePerBag: { type: Number, required: true, default: 0 },
  depotName: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

CementBrandSchema.index({ isActive: 1 });

CementBrandSchema.plugin(tenantPlugin);

export default mongoose.models.CementBrand || mongoose.model('CementBrand', CementBrandSchema);
