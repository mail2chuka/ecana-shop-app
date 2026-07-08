import mongoose from 'mongoose';

const SaleItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['cement', 'stonedust', 'shop'], required: true },
  // Cement-specific
  atc: { type: mongoose.Schema.Types.ObjectId, ref: 'ATC' },
  atcNumber: String,
  cementBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'CementBrand' },
  cementBrandName: String,
  // Aggregate-specific
  stoneDustProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'StoneDustProduct' },
  quarryName: String,
  size: String,
  // Shop-specific
  shopProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopProduct' },
  shopProductName: String,
  // Common
  billQuantity: { type: Number, required: true },     // what customer pays for
  actualQuantity: { type: Number, required: true },   // what was loaded
  unitPrice: { type: Number, required: true },        // per bag or per tonne
  lineTotal: { type: Number, required: true },        // bill qty * unit price
}, { _id: true });

const SaleSchema = new mongoose.Schema({
  saleNumber: { type: String, required: true, unique: true },
  transactionNumber: { type: String, required: true, unique: true },
  saleType: { type: String, enum: ['cement', 'stonedust', 'mixed', 'shop'], required: true },

  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  customerPhone: String,
  customerAddress: String,

  truck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
  truckPlate: String,
  driverName: String,

  date: { type: Date, required: true, default: Date.now },

  items: [SaleItemSchema],

  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },

  paymentMethod: { type: String, enum: ['balance', 'cash', 'transfer', 'pos', 'cheque'], default: 'balance' },
  balanceBefore: Number,
  balanceAfter: Number,

  deliveryDeparture: Date,
  deliveryReturn: Date,

  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: String,

  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

SaleSchema.index({ customer: 1, date: -1 });
SaleSchema.index({ date: -1 });
SaleSchema.index({ saleType: 1, date: -1 });
SaleSchema.index({ truck: 1, date: -1 });

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
