import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const SupplierSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['cement_depot', 'quarry'], required: true },
  address: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

SupplierSchema.index({ type: 1, isActive: 1 });

SupplierSchema.plugin(tenantPlugin);

export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
