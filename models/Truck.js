import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const TruckSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  plateNumber: { type: String, required: true, uppercase: true, trim: true }, // unique per-org (compound index below)
  driverName: { type: String, required: true },
  driverPhone: String,
  type: { type: String, enum: ['cement', 'stonedust'], required: true },
  capacityTonnes: Number,
  ownership: { type: String, enum: ['own', 'supplier'], default: 'own' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

TruckSchema.index({ isActive: 1 });
TruckSchema.index({ type: 1, isActive: 1 });
TruckSchema.index({ organization: 1, plateNumber: 1 }, { unique: true });

TruckSchema.plugin(tenantPlugin);

export default mongoose.models.Truck || mongoose.model('Truck', TruckSchema);
