---
name: pack-fuel
description: The fuel-station vertical pack — the app-specific skill for the petrol-station-app repo (Ecana Energy). Covers the fuel product model (petrol/diesel by the litre from tanks), pump and nozzle capture, tank-dip and wetstock reconciliation, the day/shift lifecycle, regulated pricing, fleet accounts, and the fuel-specific reports. Use this whenever working inside petrol-station-app, or building the fuel pack on the merged platform. Read design-convergence and core-algorithms first — this pack obeys both and only adds what is fuel-specific.
---

# Fuel station pack

This is a **vertical pack**, in the sense defined by `platform-architecture`: it plugs into the shared core and may contribute only seven things — product types, counter screens, capture methods, reconciliations, reports, settings, and pack vocabulary. Anything else it seems to need is a core feature wearing fuel clothing; put it in the core.

The repo today is `petrol-station-app` (branch `master`, `src/` layout, JavaScript, Next.js, deployed to Vercel as Ecana Energy). It already has the operational depth the materials app lacks — day/shift lifecycle, deposit approvals, per-role dashboards. In the merge it is the *source* of those patterns, not a consumer of them. Preserve them; move them into the core so the materials side inherits them.

## The one thing this pack must get right

A fuel station is a **bulk-from-a-tank** business with a discrete shop attached. The book volume in a tank drifts from the dipped volume, and the entire value of the software is measuring that drift honestly. Everything below serves that.

---

## 1. Product types this pack registers

- **Fuel grades** — petrol 93, petrol 95, diesel (AGO), kerosene (DPK), LPG. Each is `bulk`, sold per litre, drawn from one or more tanks.
  - `priceRegulated: true` where the regulator sets the pump price. The UI must not render a discount control for a regulated grade. (See `core-algorithms` §1 — regulated price wins over every other rule.)
  - Temperature: pump meters measure ambient litres. If the business reconciles at 15°C, store the correction factor per tank and record it on the move. Most small stations reconcile ambient-to-ambient; make it a setting, don't assume.
- **Dry stock** — oil, filters, water, airtime. Discrete, counted, ordinary `discrete` products. These reuse the shop pack's model exactly; do not build a second product system for them.

## 2. Capture methods

- **Pump meter** — the primary method. A nozzle has a monotonic totaliser that never resets. A sale is `closingReading - openingReading`, converted to money at the current grade price.
  - Meter readings only ever increase. A decrease means the meter/pump head was replaced — that is a settings event with its own audit record and a new baseline, never a negative sale.
  - Capture opening readings at shift start and closing at shift end. The delta per nozzle is the litres that must be accounted for in cash, card and account sales combined.
- **Manual sale** — for a nozzle without electronic capture, the cashier keys litres directly. Same order shape, flagged `manualCapture` so reconciliation can weight it differently.

## 3. Reconciliation this pack supplies (into the shared engine)

The reconciliation *logic* lives in `core-algorithms` §5. This pack supplies the fuel-specific `measured` inputs and the tighter tolerance:

- **Tank dip** — a physical dip (or gauge reading) converted to litres through the tank's **strapping table** (a per-tank calibration curve; a cylindrical tank is not linear near the ends). Store the strapping table per tank. `measured = strapping(dip)`.
- **Wetstock check** — the tighter, second reconciliation unique to fuel: **sum of pump-meter deltas must equal sum of recorded sales** for the period. Cash + card + account litres must equal metered litres. A gap here is theft, a stuck meter, or an unrecorded test-back, and it is the single most important number on a forecourt.
- Tolerance is tight — well under 1% of throughput. Outside tolerance blocks period close until a manager acknowledges with a reason.
- Report the **rolling variance trend per tank**, not just the period figure. Consistent one-way loss is a leak or a theft; random noise is measurement.

## 4. Day and shift lifecycle — this pack's crown jewel

This already exists in the repo and is genuinely good. Generalise it into the core `closeShift` (see `core-algorithms` §6), keeping fuel's three-way cash-up:

1. **Begin Day** — opens the trading day, sets opening readings and opening float per till.
2. Pumps open; sales accrue against nozzles.
3. **End Day / End Shift** — closing readings captured; three-way reconciliation (cash counted vs. sales recorded vs. meter movement) must agree within tolerance.
4. Primary CTA is **state-aware**: Begin Day → End Day → "All shifts complete". Keep this. It is the model for every owner landing action on the platform.

Deposit approvals (approve/reject with a required note) are the template for the platform's credit-override flow. Do not rebuild — lift into the core.

## 5. Fleet accounts

Fleet cards are ordinary platform credit customers (`core-algorithms` §2). A fleet fill captures **vehicle** and **odometer** on the order line so the customer can reconcile fuel per vehicle on their statement. Vehicles are a customer-scoped setting. Nothing about credit, ageing or statements is fuel-specific — it is all core.

## 6. Reports this pack adds

- **Wetstock variance** per tank, per period, with rolling trend.
- **Pump/nozzle throughput** — litres per nozzle per shift, to spot a miskeyed or leaking nozzle.
- Everything else (sales by day, ageing, cash-up) is a core report the pack does not own.

## 7. Settings this pack adds

Tanks (capacity, grade, strapping table, correction factor), pumps, nozzles (grade, tank, capture type), fuel grades and their regulated/free pricing, vehicles per fleet customer.

## 8. Known repo notes to carry into the merge

- Branch is `master`, not `main`. Layout is `src/`. It is JavaScript (`jsconfig.json`) — keep it JS; write only the extracted core in TypeScript (see `design-convergence` §6).
- The recent "totals per product, never per shift, never across products" reporting fix is correct domain logic — preserve that rule when the report moves to the core. Grand totals combine only within a single product.
- Emoji quick-action tiles are replaced with the one SVG set (`design-convergence` §1). Do not ship a new emoji tile.
- Locale is hardcoded en-NG / ₦ / Africa/Lagos. This blocks the Botswana rollout and is extracted first (`design-convergence` §4). The `Africa/Lagos` "today" boundary is the dangerous part — day/shift close computed in the wrong timezone misfiles sales across midnight and surfaces as phantom cash-up variances.

## Definition of done (in addition to core-algorithms and design-convergence checklists)

- [ ] No branch on `tenant.vertical`; capabilities used (`capture.pumpMeter`, etc.)
- [ ] Meter readings treated as monotonic; a decrease is a settings event, not a sale
- [ ] Dip converted through a per-tank strapping table, never a linear guess
- [ ] Wetstock check present: metered litres reconcile to recorded sales
- [ ] Regulated grades expose no discount control
- [ ] Dry stock reuses the shared discrete-product model
- [ ] Day/shift "today" uses tenant timezone, not Africa/Lagos
