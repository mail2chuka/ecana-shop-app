import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const PriceHistorySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  productType: { type: String, enum: ['cement', 'stonedust'], required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productName: String,
  oldPrice: Number,
  newPrice: { type: Number, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByName: String,
  reason: String,
}, { timestamps: true });

PriceHistorySchema.index({ productId: 1, createdAt: -1 });

PriceHistorySchema.plugin(tenantPlugin);

export default mongoose.models.PriceHistory || mongoose.model('PriceHistory', PriceHistorySchema);
