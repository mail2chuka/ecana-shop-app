import mongoose from 'mongoose';

const ATCSchema = new mongoose.Schema({
  atcNumber: { type: String, required: true, unique: true, trim: true },
  transactionNumber: { type: String, required: true, unique: true },
  cementBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'CementBrand', required: true },
  cementBrandName: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: String,
  atcDate: { type: Date, required: true },
  bagsPaidFor: { type: Number, required: true, min: 1 },
  bagsRemaining: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'loaded', 'collecting', 'arrived', 'delivered', 'closed'],
    default: 'pending',
  },
  assignedTruck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  assignedTruckPlate: String,
  assignedDriverName: String,
  assignedDate: Date,
  loadedAt: Date,
  arrivalDate: Date,
  deliveryDate: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

ATCSchema.index({ status: 1, cementBrand: 1 });
ATCSchema.index({ atcDate: -1 });

export default mongoose.models.ATC || mongoose.model('ATC', ATCSchema);
