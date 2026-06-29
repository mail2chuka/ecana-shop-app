import mongoose from 'mongoose';

const PriceHistorySchema = new mongoose.Schema({
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

export default mongoose.models.PriceHistory || mongoose.model('PriceHistory', PriceHistorySchema);
