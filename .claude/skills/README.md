# Ecana platform skills

Seven skills for building one multi-tenant SaaS platform that offers
different products (verticals) — the petrol station app and the
cement/distribution app folded into a single system, sharing one core.

Install for Claude Code: copy the folders into `.claude/skills/` in the repo.
Read as a human spec: start with `design-convergence`.

## Platform-wide (all five apply everywhere)

| Skill | Owns | Read when |
|---|---|---|
| `design-convergence` | Which app's pattern wins per conflict; unified tokens; migration order | Touching either app. **Start here.** |
| `platform-architecture` | Tenancy, isolation, the vertical-pack system, roles, plans | Any query, route, or feature |
| `core-algorithms` | Pricing, credit, ageing, stock ledger, reconciliation, cash-up, sync | Any logic touching money or quantities |
| `materials-yard-ui` | Design tokens, counter shell, money/quantity rules | Any screen or component |
| `platform-ui` | Shared shell, tenant/site switch, onboarding, billing, owner views | Any non-counter screen |

## Vertical packs (one per product line — thin, repo-specific)

| Skill | Repo | Owns |
|---|---|---|
| `pack-fuel` | petrol-station-app | Pumps, tanks, dips, wetstock, day/shift cycle, fleet accounts |
| `pack-materials` | ecana-shop-app | Bags & stockpile, tipper delivery, ledger, portal, A4 print |

## How the pieces fit

    marketing / owner / operational  ← three tiers of UI (design-convergence)
    ┌─────────────────────────────┐
    │  pack-fuel   pack-materials  │  ← thin, repo-specific, this pair
    ├─────────────────────────────┤
    │  core-algorithms + platform  │  ← the shared spine, build once
    │  architecture + platform-ui  │
    └─────────────────────────────┘

A pack contributes only: product types, counter screens, capture methods,
reconciliations, reports, settings, vocabulary. If it needs its own
customers, invoices, or credit logic, the core has a gap — fix the core.

## Suggested order of work

1. `design-convergence` §4 and §6 — extract locale, extract tokens (unblocks everything)
2. `core-algorithms` — money to integer minor units; algorithms into a TS core package
3. `platform-architecture` — tenancy, once one paying tenant exists
4. Packs last — port each app's screens into the shared shell
