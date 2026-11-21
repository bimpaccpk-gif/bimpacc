# BIMPACC LMS — Architecture

> Replaces the stale analysis docs (`BIMPACC_LMS_ANALYSIS_AND_IMPROVEMENTS.md`, `FEATURE_ROADMAP.md`),
> which describe a much earlier state. Keep this file current when you change structure or security rules.

## Stack

Next.js 16 (App Router, `proxy.ts` instead of `middleware.ts`) · React 19 · TypeScript (strict) ·
Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage) via `@supabase/ssr` · Zod · Recharts.
Design tokens: [design-tokens.md](design-tokens.md) (source of truth: `app/globals.css`).

## Layout

| Path | Purpose |
| --- | --- |
| `proxy.ts` | Runs on every page request: refreshes the session (`getClaims()`), sets security headers, redirects unauthenticated/paused users, enforces role-based route access and the billing gate. |
| `app/(auth)` | Login / register. |
| `app/(dashboard)/{student,instructor,admin,super-admin,billing,profile}` | Role dashboards. |
| `app/actions/*.ts`, `lib/supabase/actions.ts` | Server Actions (all mutations). |
| `lib/dal.ts` | Data-access layer: `verifySession`, `getCurrentUser`, `verifyAdmin`, `verifySuperAdmin`, enrollment and content-pause resolution. |
| `lib/supabase/server.ts` | `createClient()` (user-scoped, RLS applies) and `createAdminClient()` (service role, **bypasses RLS**). |
| `lib/validations.ts` | Zod schemas for action input. |
| `lib/rate-limit.ts` | Postgres-backed rate limiter (`consume_auth_rate_limit` RPC). |
| `lib/fingerprint-*.ts`, `components/fingerprint-heartbeat.tsx` | Student device fingerprinting. |
| `supabase/migrations` | Schema + RLS history (apply in order). |
| `tests/unit`, `tests/e2e` | Vitest unit tests, Playwright smoke tests. |

## Roles

`student`, `instructor`, `admin` (stored in `users.role`). **Super admin** is not a role: it is an
admin who also has a row in `super_admins`. The super admin manages platform billing/admin access.

## Security model (current)

Defence in depth, in this order:

1. **`proxy.ts`** — optimistic route gate (UX + first barrier). Not sufficient on its own.
2. **Server Actions / pages** — must re-check identity and role via `lib/dal.ts` before doing work.
3. **RLS** — authoritative data boundary for user-scoped clients.
4. **`createAdminClient()`** — bypasses RLS; every use must be preceded by an explicit authorization
   check in the same code path.

Existing controls: rate-limited sign-in/sign-up, login history, audit log for admin actions,
per-student content pause (account → course → semester → subject → lesson), student device
fingerprint, video watermark, screenshot/screen-record deterrents. Client-side deterrents are
**deterrents, not guarantees**.

Known gaps being worked in Phase 1 (see the redesign/security plan): no CSP/HSTS, generic auth error
messages, password reset, admin MFA, fail-open rate limiter, audit/login-history insert policies,
service-role call audit, upload validation.

## Environment

See [`.env.example`](../.env.example). `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Commands

```bash
npm run dev          # dev server
npm run typecheck    # tsc --noEmit
npm run lint
npm test             # Vitest unit tests
npm run test:e2e     # Playwright (needs `npm run build` first; starts `next start`)
```
