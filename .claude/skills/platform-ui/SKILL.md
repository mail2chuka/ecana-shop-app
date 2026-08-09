---
name: platform-ui
description: UI and UX rules for the multi-tenant SaaS layer of the trade operations platform — the shared shell, tenant and site switching, onboarding, roles and users, plans and billing, cross-site owner views, and how vertical packs (materials yard, fuel station) plug their screens into the shared chrome. Use this for any screen that is not a counter screen, and whenever adding a pack screen, a settings page, or anything a business owner rather than a cashier will look at. Pairs with the materials-yard-ui skill, which owns the tokens and counter rules.
---

# Platform UI

## Scope

The `materials-yard-ui` skill owns the design tokens, the counter shell, and the money and quantity rules. **Everything in it still applies here — do not redefine tokens.** This skill covers the layer above: the chrome every tenant sees, and the seams where a vertical pack meets it.

The people using these screens are business owners and their office staff, on a laptop or a phone, usually not on site. They are asking one of three questions: *what happened today*, *who owes me money*, and *is anything wrong*. Design for those three.

---

## 1. The shared shell

One shell, three regions, for every non-counter screen.

**Top bar** — business name with a switcher, then site name with a switcher, then sync state, then the user menu. Nothing else ever goes in the top bar.

**Sidebar** — the same three groups in the same order for every vertical: **Sell**, **Manage**, **Know**. A vertical pack may add at most two items, and only under Manage. If a pack wants a fourth group, refuse it.

**Content** — page header with title and primary action, then filter bar, then the work. Detail opens in a right drawer on wide screens and a full page on narrow ones. Never a modal for anything that contains data the user needs to compare against what is behind it.

The shell is identical whether the tenant runs a yard, a station, or both. **A user who learns one vertical must already know the other** — that is the product argument for the whole platform, and it dies if packs style themselves differently.

---

## 2. Tenant and site switching

- The tenant switcher is only visible to users who belong to more than one tenant. For everyone else it is plain text.
- The **site switcher is always visible**, even for single-site tenants, showing the site name. This teaches the concept before it matters and prevents the "which yard was I looking at" mistake later.
- Switching site never changes what page you are on. Same route, new scope.
- **Every figure on screen states its scope.** A total that could be one site or all sites, without saying which, is worse than no total. Put it in the page header, not a tooltip.
- Cross-site views are an explicit "All sites" option in the switcher, and they render an unmistakable band across the page header so nobody mistakes a group total for a site total.

---

## 3. Pack screens in shared chrome

A pack contributes screens; it does not contribute chrome. Concretely:

- Pack screens use `packages/ui` components and tokens. A pack that ships its own CSS file fails review.
- The **cart panel, credit meter, customer picker and totals block are shared components**, identical across packs. Only the capture area differs — a pump grid for fuel, two product cards for the yard.
- Pack vocabulary belongs in the pack, and it must be the vocabulary the staff use. *Nozzle*, *dip*, *tanker* on a forecourt; *load*, *tipper*, *site* in a yard. Never expose the internal generic term (`bulkProduct`, `captureMethod`) to a user.
- A pack may define its own status values, but must map them to the shared `StatusChip` colours. It never introduces a new status colour.

---

## 4. Onboarding

An owner signs up and must reach a first real sale in under ten minutes, on a phone, without help. That constraint decides the design.

- Ask for four things and no more: business name, vertical, site name, currency. Everything else is a default you can change later.
- Pre-seed the vertical's products. A fuel station starts with petrol 93, petrol 95 and diesel; a yard starts with cement and stone dust. Seeded, editable, already priced at zero with an obvious prompt to set the price.
- **The first screen after signup is the counter, not a dashboard.** A tour is not onboarding; a completed sale is.
- Progress is a dismissible checklist in the sidebar — set prices, add a customer, record a sale, invite a user — not a blocking wizard. Never trap someone in setup.
- Import comes later and is never a prerequisite. Customer import is the single most common reason a trial dies at step one.

---

## 5. Users, roles and invitations

- Inviting a user asks for a phone number or an email, a role, and which sites. Nothing else.
- Show the five roles as a plain table of what each can do, in the owner's language: "can approve credit", "can change prices", "can see reports". Never show a permission matrix of internal keys.
- Show who is currently on shift, and where, on the users screen. Owners ask this constantly.
- Removing a user never deletes their history. Their name stays on every sale they made, marked inactive.

---

## 6. Plans and billing

- One page. Current plan, what is included, current usage against it, next charge date, invoice history, and a way to pay. No pricing-page marketing inside the product.
- Usage shows sites used of sites allowed, and transactions this period. If they are near a limit, say so plainly on that page **and nowhere else**. Upsell banners on working screens are how you get uninstalled.
- **Lapsed subscription: the counter keeps working.** The back office turns read-only with a single banner naming the amount due and how to pay. Never interrupt a sale for money you are owed.
- Support bank transfer as a first-class method, with the reference number displayed prominently and a way to upload proof of payment. Card-only billing does not fit this market.

---

## 7. Owner views

The three screens an owner opens most, and the rules for each:

**Today** — cash taken, account sales, variance flags, shifts open now. One screen, phone-first, no filters. This is the screen they check at 6pm; it must load instantly and say something useful with no interaction.

**Who owes me** — ageing summary across all sites, then the list, worst first, with a one-tap way to send a statement. Overdue money outranks the credit limit in the visual hierarchy, always.

**Anything wrong** — the exceptions queue: variances outside tolerance, cash-up differences, credit overrides, sales still unsynced, stock below reorder level. Each item names the person, the amount and the time, and links straight to the record. This is the screen that justifies the subscription.

Use the hazard stripe from the tokens skill only here and on the counter. It must stay rare enough to mean something.

---

## 8. Notifications

- Three channels: in-app, push, and SMS. SMS only for credit approval requests, because that is the one thing that stops a sale while a truck waits.
- The owner sets thresholds per notification. Default them conservatively — an owner who gets fifteen alerts on day one turns them all off and never returns.
- Every notification names the amount, the person and the site, and deep-links to the record. A notification that says "a variance was detected" is noise.

---

## 9. Anti-patterns

- A vertical-specific sidebar layout, colour scheme, or logo treatment.
- A dashboard of charts as the landing page. Owners want three answers, not twelve widgets.
- Upsell or usage banners on counter or working screens.
- Any total without a stated scope and as-at time.
- A modal that hides the figures the user is checking it against.
- Exposing platform vocabulary — tenant, pack, capability, vertical — anywhere a user can see it. To them it is their business, their sites, and what the software does.
- Blocking a sale for a billing, sync, or setup reason.

---

## 10. Definition of done

- [ ] Uses shared shell, tokens and components; no pack-specific chrome or CSS
- [ ] Works at 375px, 768px and 1440px
- [ ] Every figure states site scope and as-at time
- [ ] Site switcher present and functional, including single-site tenants
- [ ] Permission-gated in UI *and* server-side
- [ ] Renders correctly for a lapsed subscription (read-only, selling unaffected)
- [ ] Renders correctly for a brand-new tenant with no data (empty states with actions)
- [ ] No platform jargon in any user-visible string
- [ ] Nothing on the anti-patterns list
