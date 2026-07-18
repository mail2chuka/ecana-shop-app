import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import CustomerPayment from '@/models/CustomerPayment';

export async function buildCustomerStatement(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) return null;

  const [sales, payments] = await Promise.all([
    Sale.find({ customer: customerId, status: 'active' }).sort({ date: -1 }).limit(200),
    CustomerPayment.find({ customer: customerId }).sort({ date: -1 }).limit(200),
  ]);

  const ledger = [];
  sales.forEach(s => {
    const qty = s.items.reduce((sum, i) => sum + (i.billQuantity || 0), 0);
    ledger.push({
      date: s.date,
      createdAt: s.createdAt,
      type: 'sale',
      ref: s.saleNumber,
      description: `Sale: ${s.items.map(i => `${i.billQuantity} ${i.itemType === 'cement' ? 'bag' : 'tonne'} ${i.cementBrandName || `${i.quarryName} ${i.size}`}`).join(', ')}`,
      qty,
      // Exact when the sale has a single line item (the common case); an average when it has
      // several (e.g. a multi-product shop cart) — still the most honest single number available.
      unitPrice: qty > 0 ? s.subtotal / qty : 0,
      transport: s.transportFee || 0,
      debit: s.grandTotal,
      credit: 0,
      balance: s.balanceAfter,
      id: s._id,
    });
  });
  payments.forEach(p => ledger.push({
    date: p.date,
    createdAt: p.createdAt,
    type: 'payment',
    ref: p.transactionNumber,
    description: p.notes || `Payment via ${p.method}`,
    qty: null,
    unitPrice: null,
    transport: null,
    debit: 0,
    credit: p.amount,
    balance: p.balanceAfter,
    id: p._id,
    transactionNumber: p.transactionNumber,
    method: p.method,
    amount: p.amount,
    depositorName: p.depositorName,
    bankName: p.bankName,
    reference: p.reference,
  }));

  // Recompute a running balance in true chronological order (oldest first), anchored to the
  // customer's current balance. Stored balanceAfter snapshots reflect the balance at the moment
  // each transaction was entered, not its chosen date — backdated entries make those snapshots
  // inconsistent when displayed in date order, so we derive the column fresh instead of trusting it.
  const chronological = [...ledger].sort((a, b) => {
    const dateDiff = new Date(a.date) - new Date(b.date);
    if (dateDiff !== 0) return dateDiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  const totalCredit = chronological.reduce((s, e) => s + e.credit, 0);
  const totalDebit = chronological.reduce((s, e) => s + e.debit, 0);
  let running = customer.balance - totalCredit + totalDebit;
  chronological.forEach(entry => {
    running += entry.credit - entry.debit;
    entry.balance = running;
  });

  const sortedLedger = [...chronological].reverse();

  return { customer, ledger: sortedLedger };
}
