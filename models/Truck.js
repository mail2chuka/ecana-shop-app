import mongoose from 'mongoose';

const TruckSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
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

export default mongoose.models.Truck || mongoose.model('Truck', TruckSchema);
