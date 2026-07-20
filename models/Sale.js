import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

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
  quarryPurchase: { type: mongoose.Schema.Types.ObjectId, ref: 'QuarryPurchase' },
  quarryPurchaseRef: String,
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
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  saleNumber: { type: String, required: true }, // unique per-org (compound index below)
  transactionNumber: { type: String, required: true }, // unique per-org (compound index below)
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

  editedAt: Date,
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  editedByName: String,

  // Retroactive financial corrections applied after the sale was recorded. These never mutate
  // subtotal/grandTotal above (which stay as the historical record of what was actually sold) —
  // each adjustment is its own dated, reason-tagged entry that separately moves the customer's balance.
  adjustments: [{
    type: { type: String, enum: ['surcharge', 'refund'], required: true },
    method: String, // surcharge: 'per_unit' | 'flat_total' | 'transport'; refund: 'shortfall'
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedByName: String,
    appliedAt: { type: Date, default: Date.now },
    balanceBefore: Number,
    balanceAfter: Number,
  }],
}, { timestamps: true });

SaleSchema.index({ customer: 1, date: -1 });
SaleSchema.index({ date: -1 });
SaleSchema.index({ saleType: 1, date: -1 });
SaleSchema.index({ truck: 1, date: -1 });
SaleSchema.index({ organization: 1, saleNumber: 1 }, { unique: true });
SaleSchema.index({ organization: 1, transactionNumber: 1 }, { unique: true });

SaleSchema.plugin(tenantPlugin);

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
