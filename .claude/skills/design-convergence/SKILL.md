---
name: design-convergence
description: The binding decisions for merging Ecana PMS (petrol station back-office) and the distribution admin app (cement, quarry, ATC, ledger, customer portal) into one multi-tenant platform — unified tokens, which app's pattern wins for each conflict, the three tiers of visual expression, locale extraction, and the migration order. Use this whenever touching either existing app, porting a screen between them, adding shared components, or resolving a styling or pattern disagreement between the two codebases. Consult before writing any new UI in either app, always.
---

# Design convergence

## The situation

Two working Next.js apps, both Nigerian-locale, both serving trade businesses that sell physical stock on cash and credit.

- **Ecana PMS** — petrol station back-office. Role-based dashboards, day and shift lifecycle, deposit approvals, pump and tank data, dense reporting. Visually lively: maroon/navy/magenta gradients, glassmorphism, emoji tiles.
- **Distribution app** — cement and quarry distribution. Module- and role-filtered shell, unified customer ledger, A4 print and receipts, customer self-service portal. Visually plain: flat emerald and Tailwind defaults, with an expressive marketing landing page firewalled from the admin app.

They are the same product with different nouns. The merge is not a rewrite — it is a convergence, run one layer at a time against live users.

## The governing decision

> **The distribution app contributes the shell. Ecana contributes the operations. Neither app's visual language survives unchanged.**

The distribution app's `AdminShell` already filters navigation by role *and* by subscribed module. That is the capability system the platform needs, and Ecana's flat per-role sidebar cannot express a tenant that runs both a station and a yard. Port Ecana's screens into that shell.

Ecana's day/shift lifecycle, state-aware primary CTA, and note-required approval flows are the operational depth the distribution app lacks. Lift them into the core.

---

## 1. Conflict resolutions — binding

| Conflict | Resolution | Why |
|---|---|---|
| Brand colour | Deep emerald `#0B4F3A` | Already the shell colour of the app that owns the shell |
| Maroon `#8B1E3F` | Demoted to the fuel vertical's tint | Keeps Ecana's identity where it carries meaning |
| Danger | Red `#B3261E` | Amber-as-destructive gets clicked through |
| Money owed | Red — same token as danger | Both mean "stop and look"; one red, no ambiguity |
| Warning / pending | Amber `#B26B00` only | Amber loses its danger duty entirely |
| Product tints (PMS/AGO/DPK/LPG) | Kept, data-only | Real information on a forecourt; never chrome |
| Product font | Inter | Already Ecana's; the distribution admin has no opinion |
| Marketing font | Manrope | Marketing surfaces only |
| Icons | One SVG set, project-wide | See below |
| Confirmations | Modal with required note | See below |
| Gradients, glow, glassmorphism | Tier-limited | See section 2 |
| Locale | Per-tenant configuration | See section 4 |

### Emoji iconography is removed

Ecana uses emoji in quick-action tiles alongside inline SVG elsewhere. Pick one SVG set (Lucide or Tabler) and use it everywhere. Emoji render differently on every platform, cannot inherit colour or stroke weight, are read aloud unpredictably by screen readers, and make a finance tool look improvised to the owner evaluating it. Replace them one screen at a time; do not ship a new one.

### One confirmation pattern

Ecana runs modal-with-note for deposits and `window.confirm()` for user activation. `window.confirm()` is banned platform-wide. The rule:

- **Financial, auditable, or irreversible** → modal with a required note, and the note is written to the audit log.
- **Reversible** → do it immediately with an undo toast. No dialog at all.

Nothing else. If you cannot decide which bucket an action is in, it is the first one.

---

## 2. Three tiers of expression

The distribution app already discovered this by scoping its landing-page custom properties under `.landing` so they never bleed into the admin app. Formalise it:

| Tier | Where | Language |
|---|---|---|
| **Marketing** | Public site, pricing, signup | Manrope, expressive, scroll reveals, radial glow, pill CTAs |
| **Owner** | Today, Who owes me, Anything wrong, role dashboards | Inter, large figures, restrained colour, subtle motion, one hero number per card |
| **Operational** | Counter, tables, reports, forms, print | Inter, flat, dense, hairline borders, no gradients, no shadows beyond a 1px line, no motion beyond focus and hover |

Rules that make the tiers hold:

- Tier tokens are scoped like the distribution app does it: `.marketing { ... }`. They never leak.
- **Motion is a tier property.** Shimmer skeletons, fade-in-slide-up and pulsing blobs belong to marketing. Operational screens get instant paint from cache — a cashier watching a skeleton is a cashier not selling.
- Ecana's `font-black` gradient-clipped stat numbers stay on the owner tier only, at one per card. In a table they are noise.
- The decorative blurred circle on stat cards is retired. It costs paint time on the phones staff actually use.

---

## 3. Shell and navigation

- **Adopt the distribution app's `AdminShell`.** Extend its menu config with Ecana's items; keep the role plus subscribed-module filter.
- **Show non-subscribed modules, locked, rather than hiding them.** The current shell renders nothing for an unsubscribed module. That is clean but silent — a shop-only tenant never learns the quarry module exists. Render it dimmed with a lock and a one-line "what this adds", linking to the plan page. This is the single highest-value upsell surface in the product and it costs one component.
- Keep the persistent utility bar (Back plus debounced global search). Extend the search to customers, invoices and document numbers.
- **Adopt Ecana's mobile pattern**: bottom tab bar with the first three items plus a More sheet. It beats an off-canvas drawer for one-handed use, which is how the yard and forecourt actually work.
- Add breadcrumbs for drill-downs (`admin → station → report`). Both apps currently rely on Back links and `?stationId=` params, which loses orientation as depth grows. Breadcrumbs replace the Back link; they do not sit alongside it.
- Keep Ecana's sticky-header constraint and encode it once: **any scrollable table lives in its own `overflow-auto` box.** Put it in the shared `<DataTable>` so nobody rediscovers it.

---

## 4. Locale extraction — do this first

Both apps hardcode `₦`, `en-NG` and `Africa/Lagos`. The next customer is in Botswana and uses Pula. Until this is fixed, the platform cannot be sold outside Nigeria, so it blocks everything else.

- Locale is tenant configuration: `{ currency, locale, timezone, vatRate, decimalPlaces }`.
- Every currency and number render goes through shared `<Money>` and `<Quantity>` components reading tenant config. Delete every inline `toLocaleString('en-NG')`.
- **Every "today" calculation uses the tenant timezone.** Day and shift boundaries decided in `Africa/Lagos` will silently misfile Botswana sales across day boundaries, and the errors surface as cash-up variances nobody can explain.
- Money is stored as integer minor units (kobo, thebe). Migrate stored floats before anything else touches them.
- Keep the live thousand-separator behaviour of `CurrencyInput` — it is correct for fast manual entry — but make its separator and decimal count locale-driven.

---

## 5. What to preserve carefully

These are assets, not legacy. Do not lose them in the merge.

- **The print stack.** `.no-print`, `.report-print`, true 210mm A4 receipts, the `zoom` preview trick, html2canvas capture. Statements and delivery notes are handed over on paper in both businesses. Promote this to a core platform service so the fuel side gets it too.
- **The customer portal.** A read-only balance and statement view with no shell was the right call. Extend it to fleet accounts — a haulier checking their own balance is the cheapest support reduction available.
- **Ecana's state-aware CTA.** A dashboard whose primary button changes with live shift state is genuinely good design. Generalise it: the owner's landing action should always be the next thing that needs doing.
- **The deposit approve/reject queue with a required note.** This is the approval pattern the credit-override flow needs. Reuse it, do not rebuild it.
- **Ecana's per-role landing pages.** Keep the concept, but prioritise by task rather than stacking every tile. A long vertical scroll of colour-coded tiles is a menu, not a dashboard.

---

## 6. Migration order

Each step ships to production and is stable before the next begins.

1. **Extract tokens** into `packages/ui`. Both apps import them. No visual change beyond colour corrections. Tier scoping goes in here.
2. **Extract locale.** Both apps read tenant config. Money to integer minor units.
3. **Unify shell.** Ecana adopts `AdminShell`. Its screens move in unchanged.
4. **Unify components.** One `<DataTable>`, `<Money>`, `<CurrencyInput>`, `<ConfirmModal>`, `<StatusChip>`. Delete the duplicates.
5. **Unify identity and tenancy.** One login, one tenant context, `tenantId` on every collection.
6. **Merge customers and credit** into the core ledger. One customer, one statement, both businesses.
7. **Merge stock** onto the core ledger; packs supply capture and reconciliation.
8. **Counter screens last.** Highest risk, lowest unification value.

Do not reorder this. Steps 1 and 2 are cheap and unblock everything; step 8 is expensive and unblocks nothing.

---

## 7. Known defect to fix in step 1

`app/admin/page.js` — the four KPI cards carry both `hidden` and `grid`, plus a stray `h` class. Tailwind emits `.hidden{display:none}` after `.grid{display:grid}`, so the entire stats row is invisible in production. The dashboard currently shows only Quick Actions.

Fix it, and treat it as a symptom: a duplicated card layout with no shared component and no visual check is how a whole row of KPIs disappears unnoticed. Step 4 is the actual remedy.

---

## Definition of done for any convergence work

- [ ] No colour, spacing or font value outside `packages/ui` tokens
- [ ] Correct tier applied; no marketing motion or gradients on operational screens
- [ ] No emoji in any user-visible string or icon slot
- [ ] No `window.confirm()`; financial actions use modal-with-note, written to audit
- [ ] All currency and dates via shared components reading tenant config
- [ ] No hardcoded `₦`, `en-NG` or `Africa/Lagos`
- [ ] Scrollable tables in their own `overflow-auto` box
- [ ] Print output still correct at true A4
- [ ] Screen checked at 375px, 768px and 1440px, and in print preview
