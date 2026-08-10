export function normalizeCreditLimit(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric >= 0 ? numeric : null;
}
