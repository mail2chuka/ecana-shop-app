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

export function formatCustomerLabel(customer) {
  if (!customer) return '';
  return customer.customerId ? `${customer.name} (${customer.customerId})` : customer.name;
}

const SALE_TYPE_LABELS = { cement: 'Cement', stonedust: 'Aggregate', shop: 'Cement Warehouse', mixed: 'Mixed' };
export function formatSaleTypeLabel(saleType) {
  return `${SALE_TYPE_LABELS[saleType] || 'Sale'} Sale`;
}

export function pluralizeUnit(qty, unit) {
  return `${unit}${Number(qty) === 1 ? '' : 's'}`;
}

export function saleItemUnitLabel(item) {
  const unit = item.itemType === 'cement' ? 'bag' : item.itemType === 'shop' ? (item.unit || 'unit') : 'tonne';
  return pluralizeUnit(item.billQuantity, unit);
}

export function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
