---
name: core-algorithms
description: The domain algorithms for the trade operations platform — price resolution, credit check and approval, AR ageing and payment allocation, the stock ledger, bulk reconciliation (stockpile stock takes and fuel wetstock/tank dips), shift cash-up, and idempotent offline sync. Use this whenever writing or changing any logic that touches money, quantities, stock levels, credit, or syncing, including "obvious" calculations. These rules are load-bearing — do not reinvent any of them inline.
---

# Core algorithms

Nine pieces of logic hold this platform up. Each one is written once, in `packages/core`, with tests. If you are computing a price, a balance, or a stock level anywhere else in the codebase, you are writing a bug.

**Money is stored and calculated as integer thebe.** Never a float, never at any stage. Formatting to `P 1,234.56` happens only at the UI edge.

---

## 1. Price resolution

Price is a function of product, customer and quantity — never a single field on the product.

```ts
resolvePrice({ tenantId, productId, customerId, qty, at = now }): Money
```

Resolution order, first match wins:

1. **Regulated price** — if the product is marked `priceRegulated` (fuel in Botswana is set by the regulator), use the current effective-dated regulated price. It cannot be discounted, and the UI must not offer a discount control. Overrides here are a compliance problem, not a business decision.
2. **Customer + quantity band** — a negotiated rate for this customer at this volume, effective-dated.
3. **Customer** — a flat negotiated rate.
4. **Price group + quantity band** — e.g. "contractors, 40 bags or more".
5. **Price group.**
6. **List price.**

Rules:

- Every price record is effective-dated (`validFrom`, `validTo`). Changing a price never mutates a row; it closes one and opens another. Historic invoices must reprice identically forever.
- The resolved price and the id of the rule that produced it are **written onto the order line**. Never recompute a price when displaying an old order.
- Quantity bands are inclusive-lower, exclusive-upper, and must not overlap. Validate on save, not at resolution time.
- Return the reason with the price so the UI can show "contractor rate, 40+ bags" when a cashier is challenged.

---

## 2. Credit check

```ts
checkCredit({ tenantId, customerId, orderTotal }): CreditDecision
```

```
exposure   = invoicedBalance + undeliveredOrders + thisOrder
available  = creditLimit - exposure
overdue    = sum of invoices past their due date
```

Decision:

- `blocked` if the customer is `onHold`
- `needsApproval` if `available < 0`, or if `overdue > 0` and the tenant's policy says overdue blocks
- `ok` otherwise

Two things developers routinely get wrong here:

- **Exposure includes undelivered orders.** A yard that has taken three orders it has not yet loaded has already committed that credit. Counting only invoices lets a customer go far past their limit in one morning.
- **Never hard-block.** Return `needsApproval` with the exact shortfall in money, and let the owner approve from their phone. A wall gets bypassed by processing the sale as walk-in cash, which loses the record and the money. Every approval writes an audit event with the approver, the shortfall and the reason.

---

## 3. Ageing and payment allocation

Ageing buckets are computed from invoice due dates, not issue dates: `current, 1–30, 31–60, 61–90, 90+`.

Allocation when a payment arrives:

```ts
allocatePayment({ customerId, amount, allocations? }): Allocation[]
```

- If the payer specified invoices, honour that exactly. Small businesses pay specific invoices and get upset when software decides otherwise.
- Otherwise allocate **oldest due first**, fully consuming each invoice before moving on.
- Any remainder becomes an unallocated credit on the account, visible on the statement. Never silently absorb it.
- Allocations are records, not arithmetic. Reversing a payment reverses its allocations.
- The customer's `balance` is a cached figure. `invoices` and `payments` are the truth. Recompute nightly and alert on drift — drift means a bug, and you want to know before the customer does.

---

## 4. The stock ledger

There is no mutable quantity field that anyone writes to directly.

```ts
stockMoves: {
  tenantId, siteId, productId, qty,            // signed, in the product's stock unit
  reason: 'purchase'|'sale'|'transfer'|'adjustment'|'stocktake'|'loss',
  ref, at, userId, conversionFactor?, note?
}
```

- `onHand` on the product is a **cache**, updated in the same transaction as the move. Recompute it from the ledger nightly and alert on any mismatch.
- Every move records the `conversionFactor` used if units differed (tonnes bought, cubic metres sold; litres at 15°C versus ambient). The factor may change; old records must still reconcile.
- **Stock leaves at loading, not at delivery.** A tipper that has departed is out of the yard whether or not the customer has signed. Two timestamps, two states, or every in-transit load makes your stock figure wrong.
- Moves are append-only. A mistake is corrected by an opposing move with a reason and a note, never by editing or deleting.

---

## 5. Bulk reconciliation — the shared abstraction

This is the algorithm that unifies the two verticals. A stockpile of stone dust and a tank of diesel are the same problem: book stock drifts from measured stock, and the interesting number is the variance.

```ts
reconcile({ productId, siteId, measured, periodStart, periodEnd }): Reconciliation
```

```
opening   = book quantity at periodStart
receipts  = sum of purchase moves in period
sales     = sum of sale moves in period
book      = opening + receipts - sales
variance  = measured - book
variancePct = variance / max(receipts, 1) * 100
```

- Each product type declares a **tolerance** (fuel typically well under 1% of throughput; an aggregate stockpile far more). Within tolerance, post an `adjustment` move and carry on quietly. Outside tolerance, raise an exception that a manager must acknowledge with a reason before the period can close.
- The fuel pack supplies `measured` from a tank dip converted through a strapping table; the yard pack supplies it from a survey or a truck count. **The reconciliation logic itself is identical and lives in the core.**
- Persistent one-directional variance is the signal that matters — random noise is measurement, consistent loss is theft or a leak. Report the rolling trend, not just the period figure.
- Fuel adds a second, tighter check: **pump meter totals must equal recorded sales.** Meter readings are monotonic and never reset; a decrease means the meter was replaced, which is a settings event with its own record.

---

## 6. Shift and cash-up

```ts
closeShift({ shiftId, countedCash, countedFloat }): CashUp
```

```
expectedCash = openingFloat + cashSales - payouts - banked
difference   = countedCash - expectedCash
```

- A shift opens with a named user and a counted float, and closes with a counted total. No shift, no counter access.
- Card and account sales are reconciled separately from cash; only cash can be short.
- A difference outside the tenant's tolerance requires a note before the shift closes. Do not let it be skipped, and do not let it block closing — you want the record more than you want the discipline.
- Reopening a closed shift is an owner-only, always-audited action.
- Fuel stations reconcile a third way: pump meter movement during the shift must match the litres sold on that shift. Three-way agreement (cash, sales records, meter) is the whole point of a forecourt cash-up.

---

## 7. Offline sync

The counter must work with no network. Everything below assumes the device is the temporary source of truth.

- Every record created on a device carries a client-generated `offlineId` (UUID). A **unique index on `(tenantId, offlineId)`** makes replay idempotent. This one index is the entire sync safety story — a retried upload cannot double-count a sale.
- Sync order matters: reference data down (products, prices, customers, credit limits) before transactions up.
- **Sales are append-only and never conflict.** Two devices selling the same last 10 bags both succeed, and the ledger goes negative. That is correct: it is what physically happened, and it surfaces as a variance for a human. Do not "resolve" it by rejecting a sale that already occurred.
- Reference data conflicts resolve server-wins, always. A device never overwrites a price or a credit limit.
- Credit decisions made offline use the last-known limit and are flagged `creditCheckedOffline`, so the accounts view can list orders that were approved on stale data.
- Queue depth and oldest-queued-item age are visible to the user, and are metrics you alert on.

---

## 8. Document numbering

Order, delivery note, invoice, receipt and statement numbers are per tenant, per document type, gapless and sequential. Allocate from a counter document inside the same transaction that creates the record — never from a count, never from a timestamp. Offline devices use a device-prefixed provisional number and receive the final number on sync, and the UI shows both until it settles.

Gapless numbering is a tax and audit requirement in most jurisdictions. It is far cheaper to do now than to retrofit.

---

## 9. Report aggregation

- Reports read from the ledger and the invoice tables, never from cached figures.
- Anything an owner opens daily (sales by day, ageing summary, variance trend) is materialised nightly into a `reportSnapshots` collection. Anything else runs live.
- Every report states its as-at time and its site scope in the output. An owner comparing two numbers from different scopes will assume the software is wrong, and will be right to.

---

## Definition of done for any algorithm change

- [ ] All money as integer thebe; no float arithmetic anywhere in the path
- [ ] Logic lives in `packages/core` with unit tests, not inline in a route or component
- [ ] Effective-dated data closes a row and opens a new one; never mutates history
- [ ] Multi-collection writes are in a transaction
- [ ] Idempotent under replay (`offlineId` respected)
- [ ] Cached figures have a nightly recompute and a drift alert
- [ ] Auditable actions write an audit event with actor, reason and before/after
- [ ] Tested against the seeded stockpile variance and overdue debtor fixtures
