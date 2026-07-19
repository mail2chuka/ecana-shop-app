import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const ShopProductSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true, trim: true },
  unit: { type: String, default: 'unit', trim: true }, // e.g. bag, tonne, piece
  price: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, default: 0, min: 0 },
  cementBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'CementBrand' }, // optional link, enables "Receive from ATC"
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

ShopProductSchema.plugin(tenantPlugin);

export default mongoose.models.ShopProduct || mongoose.model('ShopProduct', ShopProductSchema);
