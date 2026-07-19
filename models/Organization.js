import mongoose from 'mongoose';

// The tenant. Every other record in the system belongs to exactly one Organization.
// Phase 1 uses only name/slug/freeForever/enabledModules; the subscription fields are
// inert placeholders that the billing phase (Paystack) will populate later.
const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

  // Branding shown on invoices / statements / login footer (replaces hardcoded "Ecana Family Limited").
  logoUrl: String,
  address: String,
  invoiceFooter: String,

  // Which product modules this org uses. A pure wood/steel seller can turn cement/aggregate off.
  enabledModules: { type: [String], default: ['cement', 'aggregate', 'shop'] },

  // Subscription (billing phase). freeForever exempts the founding org (Ecana) from all trial/billing.
  subscriptionStatus: { type: String, enum: ['trialing', 'active', 'past_due', 'canceled'], default: 'trialing' },
  trialEndsAt: Date,
  freeForever: { type: Boolean, default: false },
  paystackCustomerCode: String,
  paystackSubscriptionCode: String,

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
