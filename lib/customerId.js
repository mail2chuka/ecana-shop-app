import Customer from '@/models/Customer';

export async function generateCustomerId() {
  // Compare numerically in JS rather than sorting the zero-padded string in Mongo,
  // since lexicographic sort breaks once codes cross from 4 digits into 5 (e.g. "10000" < "9999").
  const existing = await Customer.find({ customerId: { $exists: true, $ne: null } }, 'customerId');
  const max = existing.reduce((m, c) => Math.max(m, parseInt(c.customerId, 10) || 0), 0);
  const next = max > 0 ? max + 1 : 1000;
  return String(next).padStart(4, '0');
}
