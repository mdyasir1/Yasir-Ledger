# Yasir Ledger

A private, mobile-first web application for managing a **cheeti** — a monthly
contribution scheme. It tracks who has paid, who is outstanding, how much has
been collected each round, and who is due a payout.

Built for a single administrator. All figures are read from a real Supabase
PostgreSQL database; nothing is hardcoded.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase PostgreSQL |
| Data access | Prisma 7 with the `@prisma/adapter-pg` driver adapter (pure-JS `pg`) |
| Validation | Zod v4 |
| Forms | React Hook Form |
| Tests | Vitest 5 |
| Hosting | Vercel |

All money is stored as **integer paise** in `BIGINT` columns. `₹1,00,000` is
`10000000`. There is no floating point anywhere in the financial path.

---

## Getting started

```bash
npm install          # installs dependencies and generates the Prisma client
cp .env.example .env.local
# fill in .env.local, then:
npm run db:check     # verify the database connection and RLS posture
npm run db:migrate   # apply supabase/migrations/*.sql
npm run db:seed      # load members, rounds, obligations and payouts
npm run db:verify    # assert the seeded totals (the ₹1,00,000 gate)
npm run dev
```

Open <http://localhost:3000> and sign in with the administrator credentials from
`.env.local`.

### Environment variables

See `.env.example` for the full list with placeholders. Nothing in `.env.local`
is committed — it is gitignored.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Runtime connection (Supabase transaction-mode pooler, port 6543) |
| `DIRECT_URL` | Direct connection (Supabase session-mode pooler, port 5432), used by migrations |
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
| `npm run db:check` | Connectivity + RLS probe |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Idempotent seed |
| `npm run db:verify` | Verify the seeded scheme totals |
| `npm run db:generate` | Regenerate the Prisma client |

---

## Security model

- One administrator. The credential lives in server-only environment variables
  and is compared with a constant-time check.
- A successful login issues an HMAC-SHA256 signed, `HttpOnly`, `SameSite=Lax`
  session cookie. Rotating `SESSION_SECRET` invalidates every session.
- `src/proxy.ts` guards the routes, and **every server action re-verifies the
  session itself**.
- Row Level Security is enabled on every financial table with **no policies for
  `anon`/`authenticated`**, so the project's publishable key cannot read or
  write anything through PostgREST.
- `audit_logs` is append-only.

See `SECURITY.md` for the full picture, including the known trade-offs.

---

## Documentation

| Document | Contents |
|---|---|
| `docs/YASIR_LEDGER_PLAN.md` | The product requirements and implementation plan |
| `SECURITY.md` | Authentication, RLS, threat notes, hardening path |
| `BACKUP.md` | Backup and restore procedure |
| `VERCEL.md` | Deployment guide |
| `USER_GUIDE.md` | How to record payments and reconcile collections |

---

## Credit

Yasir Ledger · Cheeti contribution scheme · Managed by Yasir
