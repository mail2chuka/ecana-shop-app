// A customer literally named "Shop" represents the retail shop counter itself.
// Cement sales to this customer also stock the linked ShopProduct, since that
// sale is how cement physically moves from an ATC into the shop's inventory.
export function isShopCustomer(customer) {
  return !!customer?.name && customer.name.trim().toLowerCase() === 'shop';
}
