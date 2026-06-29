import AuditLog from '@/models/AuditLog';

export async function logAudit({ userId, userName, action, entity, entityId, before, after, session }) {
  try {
    const doc = {
      userId, userName, action, entity,
      entityId: entityId?.toString(),
      before: before || null,
      after: after || null,
    };
    if (session) {
      await AuditLog.create([doc], { session });
    } else {
      await AuditLog.create(doc);
    }
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}
