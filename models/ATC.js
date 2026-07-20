import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const ATCSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  atcNumber: { type: String, required: true, trim: true }, // unique per-org (compound index below)
  transactionNumber: { type: String, required: true }, // unique per-org (compound index below)
  cementBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'CementBrand', required: true },
  cementBrandName: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: String,
  atcDate: { type: Date, required: true },
  bagsPaidFor: { type: Number, required: true, min: 1 },
  bagsRemaining: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'loaded', 'arrived', 'closed'],
    default: 'pending',
  },
  assignedTruck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  assignedTruckPlate: String,
  assignedDriverName: String,
  assignedDriverPhone: String,
  assignedDate: Date,
  loadedAt: Date,
  arrivalDate: Date,
  deliveryDate: Date,
  closedDate: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

ATCSchema.index({ status: 1, cementBrand: 1 });
ATCSchema.index({ atcDate: -1 });
ATCSchema.index({ organization: 1, atcNumber: 1 }, { unique: true });
ATCSchema.index({ organization: 1, transactionNumber: 1 }, { unique: true });

ATCSchema.plugin(tenantPlugin);

export default mongoose.models.ATC || mongoose.model('ATC', ATCSchema);
