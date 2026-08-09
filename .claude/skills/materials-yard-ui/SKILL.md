---
name: materials-yard-ui
description: UI and UX rules for the building-materials management app (cement and stone dust, walk-in shop plus credit account customers, Next.js + MongoDB). Use this whenever building, reviewing, or changing any screen, component, form, table, or piece of interface copy in this project — including "small" changes like adding a field, a button, or a status badge. Follow it before reaching for defaults from any component library.
---

# Materials yard UI/UX

## What this app is

A yard sells two materials: **cement** (50kg bags, counted exactly) and **stone dust** (sold by cubic metre from a stockpile, measured approximately). It serves two kinds of customer:

- **Walk-in** — pays cash or card, takes the goods now. One screen, seconds long.
- **Account** — buys on 30-day credit, usually delivered by truck, settles on a monthly statement. An order becomes a delivery, then an invoice, then a payment.

Staff use it on a desktop till, a tablet at the counter, and a phone in the yard or on a delivery. The network drops. The people using it are not office workers and have not been trained.

Every rule below exists to serve that reality. When a rule and a component library default disagree, the rule wins.

---

## 0. The two shells

There are exactly two layouts in this product. Never invent a third.

**Counter shell** (`/sell`, `/receive`, `/lookup`)
Full-bleed working surface. A 64px icon rail, no sidebar, no breadcrumbs, no page title. Large targets, few controls, one obvious primary action bottom-right. Optimised for speed and for a person who is being watched by a queue.

**Admin shell** (everything else)
Sidebar with three groups — Sell, Manage, Know — then a page header, a filter bar, a table, and a detail drawer. Every admin screen is the same `<ResourcePage>` component with different config. If you are writing bespoke layout code for an admin screen, stop and extend `ResourcePage` instead.

---

## 1. Design tokens

Define these once in `globals.css` and never hardcode a colour or a pixel value anywhere else.

### Colour

```css
--ink:        #1B1D1E;  /* primary text, primary buttons */
--ink-2:      #55595B;  /* secondary text */
--ink-3:      #8A8F91;  /* hints, placeholders, disabled */
--line:       #E2E4E3;  /* hairline borders */
--surface:    #FFFFFF;  /* cards, tables, panels */
--surface-2:  #F6F7F6;  /* page background, table header, rails */

--accent:     #1B5FBF;  /* selection, links, focus ring */
--accent-bg:  #E8F0FB;

--warn:       #8A5300;  /* text on warning surfaces */
--warn-bg:    #FDF1DC;
--danger:     #A3251E;
--danger-bg:  #FBEAE8;
--ok:         #1B6E48;
--ok-bg:      #E6F3EC;

--hazard:     #F2C200;  /* see below — used sparingly */
```

**The hazard stripe is the one signature element.** A 4px `--hazard` bar on the leading edge of a row or card means *a human must look at this*: over credit limit, stock below reorder level, delivery not signed for, sale pending sync. It is borrowed from the hazard tape already all over the yard, and it is the only decorative device in the product. Do not use `--hazard` as a background, a button colour, or a brand accent. If it starts appearing on more than a handful of things at a time, it has stopped working — raise it rather than adding more.

### Type

IBM Plex Sans for everything, IBM Plex Mono for figures. Plex is chosen for legible tabular figures — quantities and money must line up when scanned in a column.

```
28px / 500   page title, counter total
20px / 500   section heading, cart total
16px / 400   body, all counter-screen text  ← minimum on counter screens
14px / 400   admin body, table cells
12px / 400   labels, metadata, helper text  ← absolute minimum anywhere
```

Two weights only: 400 and 500. Never 600 or 700. Sentence case everywhere, including buttons and column headers.

### Space, radius, targets

Spacing is multiples of 4: `4 8 12 16 24 32`. Nothing else.
Radius: `6px` controls, `10px` cards. Never fully rounded except status pills.
Borders: `1px solid var(--line)`. One border, not two — a bordered card inside a bordered panel is a bug.

**Touch targets: 44px minimum everywhere. 56px for counter-screen primary actions.** Yard staff use this with dusty hands, sometimes in gloves.

---

## 2. Responsive rules

Three breakpoints. Same routes, same features, different layout. Never build a separate mobile app or hide a feature on small screens.

| Width | Counter shell | Admin shell |
|---|---|---|
| `< 768px` | Single column. Cart collapses to a fixed bottom sheet showing item count + running total + primary button. | Sidebar becomes a drawer. Tables become stacked cards, two facts per card plus the row action. |
| `768–1279px` | Two columns: working area + cart panel. | Sidebar collapses to icons. Tables keep 4 columns max. |
| `≥ 1280px` | Full three-region layout. | Full sidebar, full table, detail opens in a right drawer. |

**Never horizontally scroll a table on a phone.** Convert to cards.
**The running total is always visible on the counter screen at every width.** It is the number staff get asked about most.

---

## 3. Money, quantities, and units

This is where trust is won or lost. Get it wrong and staff go back to a notebook.

- Money renders as `P 12,220.00` — currency prefix, thousands separator, always 2 decimals, always `font-variant-numeric: tabular-nums`, always right-aligned in tables.
- **Never render a bare quantity.** `40` is wrong. `40 bags` and `10.0 m³` are right. Cement quantities are integers; stone dust shows one decimal.
- **Never do money maths in floating point.** Store and calculate in thebe (integer minor units) and format at the edge. A single `formatPula()` and `formatQty()` helper — no ad-hoc `toFixed` calls in components.
- Cement stock is exact: `612 bags`. Stone dust stock is an estimate: `≈ 340 m³`, with the tilde, plus the date of the last stock take underneath. The interface must be honest that one number is measured and the other is judged, or the first variance destroys confidence in both.
- Show the unit price next to every line so staff can answer "why is it that much" without leaving the screen.
- Any converted figure (tonnes bought, cubic metres sold) shows the conversion factor used on hover or in the row detail.

---

## 4. Credit UI

- The customer selector is the mode switch. Choosing an account customer changes the price shown, reveals the credit panel, and relabels the primary button from **Take payment** to **Confirm order**. It never silently changes anything.
- The credit panel shows, in this order: name, terms, anything overdue, then a bar with `owing / limit` and the available figure. Overdue money is more urgent than the limit — a customer inside their limit but 90 days late is the real problem.
- **Never hard-block a sale.** If the order exceeds available credit, disable the confirm button, explain the shortfall in exact money (`Over available credit by P 420`), and offer **Request approval** — which pushes a notification to the owner's phone. A hard wall gets worked around by processing the sale as walk-in cash, and then you have lost both the money and the record.
- Every override records who approved it, when, and against which order, and appears in an overrides report. That log is the feature; the block is just the trigger for it.

---

## 5. Offline and sync

The app is a PWA. Sales are written to IndexedDB first, then synced.

- A persistent sync chip lives in the top bar with exactly three states: **synced** (quiet, secondary text), **offline** (warning colour, plus a count of queued sales), **syncing** (spinner).
- **Never block an action because the device is offline.** Selling, receiving stock and capturing a delivery signature all work offline. Only credit approval and reports require a connection, and those say so plainly.
- Queued records carry the hazard stripe until they land on the server.
- Never show a raw error when a sync fails. Show `Couldn't sync 3 sales. They're saved on this device and will retry.` and keep retrying.
- Every offline-created record carries a client-generated `offlineId`. The UI must be safe to double-submit.

---

## 6. Forms and tables

- Labels above inputs, always visible. Never placeholder-as-label.
- Validate on blur, not on keystroke. Show the error under the field, in words, naming the fix: `Enter a quantity of 1 bag or more`.
- Never disable a button without saying why. Either enable it and explain on click, or put the reason next to it.
- Destructive actions need a typed confirmation only when they cannot be undone. Everything else gets an undo toast instead of a dialog.
- Tables: sticky header, zebra-free, hairline row separators, right-aligned numeric columns, the row action on the right edge. Sort defaults to most recent first.
- Empty states name the action, not the emptiness: **Add your first customer**, not *No customers found*.
- Every list that can exceed 50 rows is paginated server-side. No infinite scroll — staff need to find a specific record, not browse.

---

## 7. Interface copy

- Sentence case. No terminal punctuation on buttons and labels. Helper text and errors get full stops.
- Verbs first, and the same verb all the way through: the button says **Confirm order**, the toast says **Order confirmed**, the status says **Confirmed**.
- Plain words for the domain the staff actually use: *load*, *tipper*, *bags*, *site*, *statement*. Not *SKU*, *transaction record*, *fulfilment entity*.
- Errors say what happened and what to do. No apologies, no exception strings, no "Error:" prefix.
- Never use "successfully". The toast is the success.
- Write for someone with a queue in front of them.

---

## 8. Build these components once

Everything else composes from them. If a screen needs something not on this list, add it here first.

```
<ResourcePage>     filter bar + table + detail drawer, config-driven
<Money>            formats, aligns, tabular figures
<Quantity>         number + unit, exact vs estimated variants
<QtyStepper>       minus / value / plus + preset chips (pallet, 7/10/14 m³)
<CustomerPicker>   search, recent, walk-in option, sets pricing mode
<CreditMeter>      limit bar, ageing chips, available figure
<StatusChip>       draft / approved / dispatched / delivered / invoiced / paid
<HazardRow>        leading 4px stripe wrapper for anything needing attention
<SyncChip>         synced / offline / syncing
<SignaturePad>     proof of delivery capture, works offline
<EmptyState>       heading + one line + one action
```

---

## 9. Anti-patterns

Reject these in review:

- A modal on the counter screen. It hides the total and traps focus while a customer waits.
- Product search on the counter screen. There are two products. Show both as large cards.
- A dashboard as the landing page. Staff land on the till; the owner lands on the till too, with one link to reports.
- Colour as the only signal. Every status has an icon or a word alongside the colour.
- Icon-only buttons without a visible label anywhere except the icon rail.
- Any number without a unit or a currency prefix.
- Toasts for anything the user needs to read carefully. Money problems go inline, next to the money.
- More than one primary button on screen.
- Skeleton loaders everywhere. Load the shell instantly from cache and fill the data; the till must never show a blank screen.

---

## 10. Definition of done

Before any UI pull request is opened, check every line:

- [ ] Works at 375px, 768px and 1440px with no horizontal scroll
- [ ] Every interactive element is at least 44px tall (56px on the counter screen)
- [ ] Keyboard reachable, visible focus ring, logical tab order; the counter screen is fully operable by keyboard and barcode scanner
- [ ] Every colour, spacing and radius value comes from a token
- [ ] All money via `<Money>`, all quantities via `<Quantity>` with units
- [ ] Behaves correctly with the network off, and again when it comes back
- [ ] Loading, empty, and error states all exist and are written in the voice above
- [ ] Text contrast at least 4.5:1
- [ ] Nothing on the anti-patterns list
- [ ] Tested once at arm's length, in bright light, with one hand
