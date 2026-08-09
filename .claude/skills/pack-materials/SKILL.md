---
name: pack-materials
description: The materials/distribution vertical pack — the app-specific skill for the ecana-shop-app repo (internally cement-app). Covers the materials product model (cement in bags, stone dust and aggregate by the cubic metre from a stockpile), tipper delivery and proof of delivery, stockpile reconciliation, credit accounts and the customer portal, and the A4 print/receipt stack. Use this whenever working inside ecana-shop-app, or building the materials pack on the merged platform. Read design-convergence and core-algorithms first — this pack obeys both and only adds what is materials-specific.
---

# Materials / distribution pack

This is a **vertical pack** (see `platform-architecture`): it plugs into the shared core and contributes only product types, counter screens, capture methods, reconciliations, reports, settings, and vocabulary. Anything broader belongs in the core.

The repo today is `ecana-shop-app` (internally `cement-app`, branch `main`, Next.js 14, JavaScript, Mongoose, NextAuth v4, Tailwind 3, deployed to Vercel). It already owns the pieces the platform is built around — the **module-and-role-filtered `AdminShell`**, the **unified customer ledger**, the **A4 print/receipt stack**, and the **customer portal**. In the merge this app contributes the shell and the ledger; it is the base the platform grows from. Protect those assets.

## The one thing this pack must get right

A materials yard sells a **counted discrete** product (cement bags) and a **bulk-from-a-stockpile** product (stone dust, aggregate) side by side, mostly on **credit with delivery**. Bags reconcile exactly; the stockpile drifts and is honest about it. The credit-and-delivery lifecycle — order → load → deliver → invoice → statement → payment — is the heart of the app, and it is longer than a shop sale.

---

## 1. Product types this pack registers

- **Cement** — `discrete`, sold per 50kg bag, counted exactly. Bought by pallet/tonne, sold by bag: store the conversion factor and record it on each purchase move. Track **brand** (Dangote, BUA, etc.) as a product attribute — customers ask for a brand, and price differs by brand.
- **Stone dust / aggregate** — `bulk`, sold per cubic metre (or tonne) from an open stockpile. Bought by the tonne, sold by m³: bulk density (~1.5–1.6 t/m³) is an owner-set factor, not a constant. Stock shows as an estimate (`≈ 340 m³`) with the last stock-take date, never as a false-precise integer.

## 2. Capture methods

- **Counter quantity** — bags counted, cubic metres estimated by load. A quantity stepper with presets (a pallet of cement; 7/10/14 m³ tipper loads) beats free typing for the common cases.
- **Delivery vs collection** is a per-order property, not a product one. A delivery adds a zone-based fee and a delivery record; a collection does not.

## 3. Reconciliation this pack supplies (into the shared engine)

Uses the shared engine in `core-algorithms` §5; supplies materials-specific `measured` inputs and a looser tolerance:

- **Cement** — a bag count. Exact. Any variance is breakage or theft and is worth investigating at small numbers.
- **Stockpile** — a survey, truck-count, or estimate for stone dust/aggregate. Tolerance is **wide** (aggregate settles, holds moisture, a "10 m³" tipper is never exactly 10 m³). Within tolerance, post a quiet adjustment; outside, raise an exception with a shrinkage figure.
- Make the stockpile stock-take a **routine monthly action with a shrinkage % report**, not an error correction buried in settings. If the app treats a 3% stockpile variance as a failure, staff stop trusting the number and return to a notebook.

## 4. The credit-and-delivery lifecycle — this pack's core flow

This is longer than a shop sale and must be modelled as distinct documents, not one "sale":

1. **Order** — customer, lines, fulfilment (collect/deliver), site/zone. Runs the credit check (`core-algorithms` §2). Over-limit → owner approval, never a hard block.
2. **Load** — **stock leaves the yard at loading, not at delivery.** A departed tipper is gone from stock whether or not the customer has signed. Two timestamps, two states.
3. **Deliver** — proof of delivery: signature (works offline), optional photo, delivering vehicle and driver.
4. **Invoice** — from the delivered order, on the customer's terms.
5. **Statement / payment** — via the core ledger and ageing.

## 5. Credit accounts, ledger and portal — already built, keep

- The **unified customer ledger** is the thing the fuel side will adopt. Do not fork it; generalise it into the core so one customer can both fuel and collect cement on one statement.
- The **customer portal** (read-only balance + statement, no shell) is the right shape. Extend it to fleet accounts rather than building a second portal.
- Red-means-money-owed is kept but merged with danger (`design-convergence` §1): red now means "stop and look" for both a debt and a destructive action.

## 6. The A4 print/receipt stack — already built, protect and promote

`.no-print`, `.report-print`, true 210mm A4 receipts, the CSS `zoom` phone-preview trick, `html2canvas`→PDF capture. Statements and delivery notes are handed over on paper here. Promote this to a **core platform service** so fuel inherits it.

- **Caveat (`design-convergence` + repo reality):** `html2canvas` is effectively unmaintained and breaks on modern CSS colour functions. Pin Tailwind at 3.x; do not let a Tailwind 4 upgrade emit `oklch()` colours into a receipt. Treat moving receipt generation server-side (React-PDF or Puppeteer) as a real roadmap item, not a nicety.

## 7. Reports this pack adds

- **Stockpile shrinkage** per material, per period, with trend.
- **Deliveries** — loads out, in transit, delivered, by vehicle/driver.
- **Aged debtors** and **daily cash-up** are core reports, not owned here — but they are the two that sell the software to this owner, so make sure the pack's data feeds them cleanly.

## 8. Settings this pack adds

Cement brands, materials and their sell/buy units and conversion/density factors, delivery zones and fees, vehicles and drivers, stockpile locations.

## 9. Known repo notes to carry into the merge

- **The invisible KPI row.** `app/admin/page.js` — the four KPI cards carry both `hidden` and `grid` (plus a stray `h`); Tailwind's `.hidden` wins, so the stats row is invisible in production and only Quick Actions shows. Fix in token-extraction step; the real cure is one shared card component (`design-convergence` §7).
- **No TypeScript, no tests.** Keep the app JS; write the extracted core in TS with Vitest. The missing test framework is why a whole KPI row vanished unnoticed.
- **Non-subscribed modules are hidden, not locked.** The shell renders nothing for an unsubscribed module — clean but a silent upsell miss. Render dimmed + locked with a one-line "what this adds" linking to the plan page (`design-convergence` §3).
- **NextAuth v4** → v5 (Auth.js) when tenancy lands, to carry `tenantId`/`siteId`/`role` in the session cleanly.
- **Add Zod** at the route-handler boundary *before* multi-tenancy — an unvalidated body becomes a cross-tenant write once requests carry a tenant.
- Locale hardcoded en-NG / ₦; extract first (`design-convergence` §4).

## Definition of done (in addition to core-algorithms and design-convergence checklists)

- [ ] No branch on `tenant.vertical`; capabilities used
- [ ] Cement counted exactly; stockpile shown as an estimate with last-take date
- [ ] Stock leaves at loading, with a separate delivered state
- [ ] Proof of delivery (signature) works offline
- [ ] Conversion/density factors stored and recorded on each move
- [ ] Print output verified at true A4 after any styling change
- [ ] Ledger/portal generalised into core, not forked
