import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const QuarryPurchaseSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  referenceNumber: { type: String, required: true }, // unique per-org (compound index below)
  quarry: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  quarryName: String,
  stoneDustProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'StoneDustProduct', required: true },
  size: String,
  truck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  truckPlate: String,
  driverName: String,
  tonnage: { type: Number, required: true, min: 0.01 },
  tonnesRemaining: { type: Number, required: true },
  costPricePerTonne: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  date: { type: Date, required: true, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

QuarryPurchaseSchema.index({ quarry: 1, date: -1 });
QuarryPurchaseSchema.index({ stoneDustProduct: 1, tonnesRemaining: 1 });
QuarryPurchaseSchema.index({ organization: 1, referenceNumber: 1 }, { unique: true });

QuarryPurchaseSchema.plugin(tenantPlugin);

export default mongoose.models.QuarryPurchase || mongoose.model('QuarryPurchase', QuarryPurchaseSchema);
