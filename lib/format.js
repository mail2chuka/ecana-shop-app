export function formatNaira(amount) {
  const n = Number(amount) || 0;
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-NG');
}

export function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
