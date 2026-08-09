---
name: platform-architecture
description: Multi-tenant SaaS architecture rules for the trade operations platform — tenancy and data isolation, the vertical pack system (materials yard, fuel station), module registry, routing, permissions, plans and metering. Use this whenever adding a tenant-facing feature, creating or changing a vertical pack, touching auth or routing, writing any database query, or deciding where a piece of logic belongs. Consult it before writing a query that touches business data, always.
---

# Platform architecture

## What this platform is

One multi-tenant SaaS serving small trade businesses that sell physical stock over a counter, on cash and on credit. Two verticals exist today:

- **Materials yard** — cement in bags, stone dust by the cubic metre from a stockpile, tipper delivery, 30-day accounts.
- **Fuel station** — petrol and diesel by the litre from underground tanks, pump and nozzle capture, fleet accounts, a dry-stock shop.

They are the same business shape with different nouns. A tank is a stockpile. A tanker delivery is a tipper load. A pump totaliser reading is a stock take. A fleet card is a credit account. **Build for that shared shape and let each vertical be thin.**

## The one rule that governs everything

> If two verticals both need it, it belongs in the core. If only one needs it, it belongs in that pack. If a pack needs its own customers, its own invoices, or its own credit logic, the abstraction has leaked — fix the core, do not fork the pack.

---

## 1. Layers

```
apps/web                 Next.js app — routing, shells, auth
packages/core            domain: customers, credit, stock ledger, orders,
                         payments, shifts, reports. Knows nothing of verticals.
packages/packs/yard      materials yard pack
packages/packs/fuel      fuel station pack
packages/platform        tenancy, roles, sync, plans, metering, audit
packages/ui              tokens + shared components (see platform-ui skill)
```

Dependency direction is strictly downward. **`core` must never import from a pack.** A pack imports from `core`, `platform` and `ui`. If you find yourself adding `if (tenant.vertical === 'fuel')` inside `core`, stop — that is a missing extension point, and the fix is a registry entry.

---

## 2. What a vertical pack may contribute

A pack registers itself with the module registry and may contribute exactly these things. Nothing else.

```ts
export const fuelPack: VerticalPack = {
  id: 'fuel',
  name: 'Fuel station',

  productTypes: [ ... ],      // bulk/discrete, units, conversions, price rules
  counterScreens: [ ... ],    // e.g. the pump grid; uses shared cart + credit panel
  captureMethods: [ ... ],    // how a quantity is measured (pump meter, tipper load)
  reconciliations: [ ... ],   // how book stock is compared to measured stock
  reports: [ ... ],           // wetstock variance; stockpile shrinkage
  settings: [ ... ],          // tanks, pumps, nozzles / bins, vehicles, zones
};
```

If a proposed feature does not fit one of those seven slots, it is a core feature wearing a costume. Put it in `core` behind a capability flag instead.

**Capability flags, not vertical checks.** Screens ask `tenant.can('capture.pumpMeter')`, never `tenant.vertical === 'fuel'`. A tenant that runs a filling station with a hardware shop attached needs both packs at once, and vertical checks make that impossible.

---

## 3. Tenancy and isolation

**Model: shared database, shared collections, `tenantId` on every document.** Do not start with a database per tenant — the operational cost lands long before the customer count justifies it. Revisit only if a customer contractually requires physical separation.

Non-negotiables:

- Every collection has `tenantId`. Every compound index leads with `tenantId`.
- **No route handler, server action, or job ever constructs a raw query.** All data access goes through a repository created from the request context: `const db = repos(ctx)` where `ctx` carries `tenantId`, `siteId`, `userId`, `role`. The repository injects the tenant filter. Direct driver access outside `packages/core/db` fails review, without exception.
- Every write is checked against the tenant on the session, not on the request body. A `tenantId` arriving from the client is ignored.
- Background jobs and webhooks build an explicit system context with a named tenant. There is no ambient "all tenants" query outside migration scripts.
- Add a test per collection that asserts a query without `tenantId` throws.

**Sites within a tenant.** A tenant is the business; a site is a yard, a station, a branch. Stock, tills and shifts belong to a site. Customers, credit limits and pricing belong to the tenant, so an account customer can fuel at one station and collect cement at another and receive one statement. Model `siteId` from day one even for single-site customers — retrofitting it means rewriting every stock query.

**Routing.** `app.yourdomain.com/[tenantSlug]/[siteSlug]/...`, resolved in middleware into the request context. Subdomains per tenant are a later optimisation; do not let them into the data layer.

---

## 4. Roles and permissions

Five roles, deliberately few:

| Role | Scope |
|---|---|
| `owner` | everything, including plans, users, credit overrides |
| `manager` | one site: pricing, stock, customers, approvals within limits |
| `cashier` | counter screens, own shift, own cash-up |
| `driver` | delivery list, proof of delivery capture, nothing else |
| `accounts` | invoices, statements, payments, ageing — no counter access |

Permissions are checked in three places and all three are required: middleware for route access, the repository for data scope, and the UI for what renders. UI checks are cosmetic only — never the sole gate.

Anything an `owner` can do that a `manager` cannot is, by definition, worth auditing. Write it to the audit log.

---

## 5. Audit log

One append-only `auditEvents` collection: who, what, when, which tenant and site, before and after. It records at minimum credit-limit changes, credit overrides, price changes, stock adjustments, voided sales, refunds, user role changes, and shift reopenings.

This is not a compliance checkbox. For a business owner who is not on site, "who changed this and when" is the single most valuable thing the software offers, and it is what makes them trust the numbers enough to keep paying.

---

## 6. Plans and metering

Bill on something the customer already counts, not on something you find easy to measure. For these businesses the honest unit is **sites**, with a soft cap on transactions per month.

```
plans: { id, name, priceMonthly, maxSites, maxUsers, includedTxns,
         overageRate, capabilities: ['yard'|'fuel'|'delivery'|'accounts'|...] }
subscriptions: { tenantId, planId, status, periodStart, periodEnd, trialEndsAt }
usageCounters: { tenantId, period, txnCount, siteCount, lastRolledAt }
```

Rules:

- **Never block selling.** If a subscription lapses, the counter screens keep working and the back office turns read-only with a banner. A yard that cannot take cash because of a billing failure will be gone within the day, and you will deserve it.
- Capabilities are stored on the subscription, not hardcoded per vertical. Enabling the fuel pack for a tenant is a data change, not a deploy.
- Meter by writing a counter on each completed order, incremented in the same transaction. Never count by aggregating orders at month end — the query gets slower every month.
- Support Botswana payment reality: bank transfer and card. Build the invoice and payment-reference flow, not just a card form.

---

## 7. Bringing the existing petrol station app in

You have a live app. Do not rewrite it and do not fork it. Migrate in this order, and get each step working in production before starting the next:

1. **Shared identity first.** Move the petrol app onto the platform's auth and tenant context. It keeps its own database and screens. Nothing else changes. This alone gives you one login and one customer record.
2. **Move customers and credit to the core.** Fleet accounts become platform customers. Statements start coming from the core. This is the step that proves the abstraction and delivers the most obvious value.
3. **Move stock onto the core ledger**, with the fuel pack contributing tank dips and pump readings as capture and reconciliation methods.
4. **Move the counter screens last.** They are the highest-risk, most-used surface and the least valuable to unify. Reuse the shell and the cart panel; keep the pump grid as pack code.

Write down which system owns each entity during the transition, and never let two systems own the same one. The most common failure here is a period where both apps can create a customer.

---

## 8. Environments and data

- Three environments: local, staging with realistic seeded data, production. Seed data must include a stockpile with a 3% variance and an overdue debtor, because those are the states that break naive UI.
- MongoDB replica set (Atlas) is required — sales write to several collections atomically.
- Backups: daily, restore-tested quarterly. Write down the restore procedure before you have customers, not after.
- No production data on developer machines. Use the seed set.

---

## 9. Definition of done for any platform feature

- [ ] Every query goes through a tenant-scoped repository
- [ ] Compound indexes lead with `tenantId`
- [ ] `siteId` handled explicitly, including the single-site case
- [ ] Permission checked in middleware, repository and UI
- [ ] Auditable actions write an audit event
- [ ] Nothing branches on `tenant.vertical`; capabilities used instead
- [ ] Works when the subscription has lapsed (read-only, selling unaffected)
- [ ] A test asserts cross-tenant access fails
