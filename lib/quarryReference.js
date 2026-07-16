import QuarryPurchase from '@/models/QuarryPurchase';

export async function generateQuarryReferenceNumber(session) {
  for (let i = 0; i < 10; i++) {
    const candidate = String(Math.floor(10000000 + Math.random() * 90000000));
    const exists = await QuarryPurchase.findOne({ referenceNumber: candidate }).session(session || null);
    if (!exists) return candidate;
  }
  throw new Error('Could not generate a unique reference number, please try again');
}
