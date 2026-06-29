import mongoose from 'mongoose';

const ATCSchema = new mongoose.Schema({
  atcNumber: { type: String, required: true, unique: true, trim: true },
  cementBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'CementBrand', required: true },
  cementBrandName: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: String,
  atcDate: { type: Date, required: true },
  bagsPaidFor: { type: Number, required: true, min: 1 },
  bagsRemaining: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'collecting', 'arrived', 'closed'],
    default: 'pending',
  },
  assignedTruck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  assignedTruckPlate: String,
  assignedDriverName: String,
  arrivalDate: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

ATCSchema.index({ status: 1, cementBrand: 1 });
ATCSchema.index({ atcDate: -1 });

export default mongoose.models.ATC || mongoose.model('ATC', ATCSchema);
