# aixsignal-core

Extracted from `aixsignal-webapp` on 2026-09-08 — that repo grew too large/complex to keep working in, so this repo carries only the code actually reachable from the app's live MAIN + MORE navigation.

## What's in scope

Routes confirmed reachable (via a real import-graph trace with `madge`, plus manual link/navigate tracing — not guessed from docs, which had drifted from the live app):

- `/signals`, `/signals/[symbol]`
- `/proof`
- `/my`, `/my/history`, `/my/positions`, `/my/profits` (the latter three are redirect stubs into `/my?tab=...`)
- `/chart1m`, `/chart10m`, `/portfolio`
- `/trend`
- `/insight` (redirect stub) → `/insights`
- `/settings`, `/profile`, `/alerts`, `/billing`, `/link-channels`, `/checkout`, `/support`, `/pricing`
- `/notice`

**485 source files** (`app/` + `src/`), verified against a clean `pnpm run build` (all 22 routes compile) and `pnpm run type-check` (clean).

Supabase Edge Functions: `check-subscription`, `checkout-init`, `checkout-status`, `pin-snapshot`, `start-trial`, `billing-info`, `cancel-subscription`, `customer-portal`, `delete-account`, `request-refund`, `send-phone-otp`, `sync-crypto-icons`, `telegram-status`, `tg-link-token`, `verify-phone-otp` (+ `_shared`) — the only ones any of the above pages actually call. This repo points at the **same live Supabase project** as `aixsignal-webapp`; no database migrations were copied (see below).

## What's deliberately NOT here

- Auth/legal pages (signup, login, terms, privacy, forgot-password) — declined during scoping. **This means there's currently no way to log in from this repo alone.**
- The marketing landing page (`app/page.tsx`, i.e. `/`) — not a MAIN/MORE nav destination. Root `/` will 404 until you add a page or a redirect (e.g. to `/signals`).
- Admin pages, and everything under `src/views/archive/**`.
- Pages that exist in the old repo but turned out to have **no live link pointing at them** when traced: `/proof/board`, `/proof/cycles`, `/proof/symbols`, `/proof/symbol/[symbol]`, `/proof/[id]`, `/trend/board`, `/trend/feed`, `/trend/symbol/[symbol]`, `/signals/history`, `/alerts/matrix`, `/chart` (base), `/chart/multi`, `/my/history/[tradeId]`. Some of these have real page.tsx files sitting in the old repo but are pure dead code (redirect stubs, or literally unreachable). `/referral` doesn't exist anywhere in the old repo at all, despite being documented as a MORE nav item — it was never built.
- Supabase migrations — deliberately skipped. Migrations are cumulative (you can't cherry-pick "the ones a page uses"), and since this repo talks to the same live database, there was nothing to bootstrap. If you ever want this repo to be able to stand up its own fresh database, copy `supabase/migrations/` from the old repo wholesale.
- `package.json` was copied as-is from the old repo (full dependency list) to guarantee the first build succeeded — it has **not** been pruned to only what these 485 files actually import. That's a good follow-up (`depcheck` or similar) but wasn't done yet.

## Local dev

```bash
pnpm install
pnpm run dev   # http://localhost:8080
```

`.env.local` was copied from the old repo (same Supabase project, same secrets) — rotate/replace as needed if that's not what you want long-term.
