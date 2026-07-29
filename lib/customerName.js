// Same person can be typed as "Anayo Ezeh" or "Ezeh Anayo" — sorting the words after lowercasing
// makes both collapse to the same key, so word order and case don't create a false "unique" name.
export function normalizeCustomerName(name) {
  return (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');
}

export async function findDuplicateCustomerName(Customer, name, excludeId) {
  const key = normalizeCustomerName(name);
  if (!key) return null;
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const candidates = await Customer.find(query, 'name').lean();
  return candidates.find((c) => normalizeCustomerName(c.name) === key) || null;
}
