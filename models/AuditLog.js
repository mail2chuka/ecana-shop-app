import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

const AuditLogSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: String,
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

AuditLogSchema.plugin(tenantPlugin);

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
