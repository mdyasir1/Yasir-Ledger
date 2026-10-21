# Yasir Ledger

A private, mobile-first web application for managing a **cheeti** — a monthly
contribution scheme. It tracks who has paid, who is outstanding, how much has
been collected each round, and who is due a payout.

Built for a single administrator. Every figure is read from a real Supabase
PostgreSQL database; nothing is hardcoded.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Database | Supabase PostgreSQL |
| Data access | Prisma 7 with the `@prisma/adapter-pg` driver adapter (pure-JS `pg`) |
| Validation | Zod v4 |
| Forms | React Hook Form |
| Tests | Vitest 5 |
| Hosting | Vercel |

All money is stored as **integer paise** in `BIGINT` columns. `₹1,00,000` is
`10000000`. There is no floating point anywhere in the financial path.

**No Docker, no Python, no `psql`, no Supabase CLI.** Every database
operation runs through Node.js.

---

## Getting started

```bash
npm install          # installs dependencies and generates the Prisma client
cp .env.example .env.local
# fill in .env.local, then:
npm run db:check     # verify the connection and the RLS posture
npm run db:migrate   # apply supabase/migrations/*.sql
npm run db:seed      # load members, rounds, obligations and payouts
npm run db:verify    # assert the seeded totals (the Rs 1,00,000 gate)
npm run dev
```

Open <http://localhost:3000> and sign in with the administrator credentials
from `.env.local`.

### Environment variables

See `.env.example` for the full list. Nothing in `.env.local` is committed — it
is gitignored.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Runtime connection (Supabase transaction-mode pooler, port 6543) |
| `DIRECT_URL` | Direct connection (session-mode pooler, port 5432), used by migrations and the scripts |
| `ADMIN_EMAIL` | The single administrator's login identity |
| `ADMIN_PASSWORD` | The single administrator's login secret |
| `SESSION_SECRET` | HMAC key for the signed session cookie (≥ 32 random bytes) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional — only used by the RLS security check |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional — only used by the RLS security check |

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run db:check` | Connectivity and RLS probe |
| `npm run db:prisma-check` | Checks the application's own data path |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Idempotent seed |
| `npm run db:verify` | Verify the seeded scheme totals |
| `npm run db:backup` | Export every table to a JSON backup |
| `npm run db:restore -- <file>` | Restore a backup |
| `npm run e2e -- <url>` | End-to-end check against a running server |
| `npm run icons` | Regenerate the PWA icons |

---

## How it is put together

```
docs/YASIR_LEDGER_PLAN.md   the product requirements and implementation plan
prisma/schema.prisma        the data model (typed query client)
prisma.config.ts            Prisma CLI configuration
supabase/migrations/*.sql    version-controlled SQL migrations
supabase/seed.sql           idempotent seed (also runnable from the SQL editor)
scripts/                    migrations, seed, verification, backup, E2E checks
src/config/                 branding, navigation
src/lib/finance/            pure financial logic — no React, no database
src/lib/data/               the read layer, on top of Prisma
src/app/actions/            server actions: zod validated, session checked
src/proxy.ts                route protection
src/app/                    the six screens
```

The financial rules live in `src/lib/finance/` as pure functions, so they can
be tested without a database, and they are never mixed with presentation code.

### The scheme

- 17 members whose default contributions total exactly **₹1,00,000** a month
- 10 rounds, October 2026 to July 2027
- 170 contribution obligations — one per member per round
- 19 scheduled payouts
- **no payment history is fabricated**: the `payments` table starts empty

`npm run db:verify` asserts every one of those numbers against the live
database.

---

## Security model

- One administrator, a constant-time credential check, and an HMAC-SHA256
  signed `HttpOnly` session cookie.
- `src/proxy.ts` guards the routes; **every server action re-verifies the
  session**.
- Row Level Security is enabled on every financial table with **no policies
  for `anon`/`authenticated`**, so the project's publishable key cannot read
  or write anything through PostgREST.
- `audit_logs` is append-only, enforced by a database trigger.
- Payment submissions carry an idempotency key with a unique index behind it.

See [SECURITY.md](./SECURITY.md) for the full picture, including the known
trade-offs and the hardening path.

---

## Testing

```bash
npm test
```

Unit tests cover the financial rules in detail. Integration tests run against
the **live database inside a transaction that is always rolled back**, so they
never touch the real data — verified afterwards: the row counts are unchanged
and no test rows are left behind.

`npm run e2e -- http://localhost:3000` replays the real login form over HTTP
and checks that every protected screen renders the live figures.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/YASIR_LEDGER_PLAN.md](./docs/YASIR_LEDGER_PLAN.md) | Product requirements and implementation plan |
| [SECURITY.md](./SECURITY.md) | Authentication, RLS, threat notes, hardening path |
| [BACKUP.md](./BACKUP.md) | Backup and restore procedure |
| [VERCEL.md](./VERCEL.md) | Deployment guide |
| [USER_GUIDE.md](./USER_GUIDE.md) | How to record payments and reconcile collections |

---

## Credit

Yasir Ledger · Cheeti contribution scheme · Managed by Yasir
