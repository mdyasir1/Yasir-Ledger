# Security

Yasir Ledger is a private, single-administrator application. This document
describes exactly how access is controlled, what has been verified, and where
the remaining risks are.

---

## 1. The trust model

There is one user: the administrator. The application therefore has no user
accounts, no roles and no signup. Instead:

- the administrator's email and password live in **server-only** environment
  variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`);
- the login form compares them with a constant-time comparison;
- a successful login issues a **signed, stateless session cookie**;
- every protected route and every server action verifies that cookie.

All data access happens on the server. No database credential, no session
secret and no publishable key is ever sent to the browser.

---

## 2. Authentication in detail

### Credential check

`src/lib/auth.ts` compares the submitted email and password against the
configured values using `crypto.timingSafeEqual` over SHA-256 digests, so the
comparison time does not depend on the value or on how much of it matched.
Both halves of the credential are always compared, so a wrong email and a
wrong password take the same time.

### Session cookie

| Property | Value | Why |
|---|---|---|
| Format | `base64url(payload).base64url(HMAC-SHA256(payload))` | Stateless; nothing to store |
| Payload | `{ email, issuedAt, expiresAt }` | Carries the identity and the expiry |
| `HttpOnly` | yes | JavaScript cannot read it, so an XSS bug cannot steal it |
| `SameSite` | `Lax` | Blocks cross-site form posts |
| `Secure` | in production | Never sent over plain HTTP |
| `Path` | `/` | Applies to the whole application |
| Lifetime | 7 days, sliding | Long enough for daily use on a phone |
| Secret | `SESSION_SECRET`, ≥ 256 bits | Rotating it invalidates every session at once |

The signature is verified on every request. Tampering with the payload
invalidates the cookie, which is covered by the unit tests in
`src/lib/session.test.ts`.

### Brute force

The login endpoint allows 5 failed attempts per client address per 15 minutes.
The limiter is in-process, so on a serverless platform it is per warm instance
rather than global. For a single-administrator application this raises the cost
of online guessing; it is not a substitute for a strong password.

---

## 3. Route and action protection

Two independent layers:

1. **`src/proxy.ts`** — Next.js 16's replacement for `middleware.ts`. It runs
   before a request is rendered and redirects any unauthenticated request to
   `/login`, preserving the requested path so the administrator lands back
   where they were.
2. **Every server action** re-verifies the session before it writes anything.

The second layer is not redundant. A Server Function is a `POST` to the route
it belongs to, and a request that reaches the server by any other route must
not be able to write. `src/app/actions/payments.ts` shows the pattern.

The application layout re-checks the session as well, so a protected page can
never render for a signed-out visitor.

---

## 4. Database security

### Row Level Security is enabled and denies by default

`supabase/migrations/0002_row_level_security.sql`:

- RLS is **enabled and forced** on all eight financial tables;
- every table, sequence and function privilege is **revoked** from `anon` and
  `authenticated`;
- **no policy is created** for those roles.

With RLS enabled and no matching policy, those roles see zero rows and every
write is rejected. This matters because the project's **publishable key is
public by design** — it is in the dashboard, in the browser bundle of any
client-side code, and it must never be a way into the financial data.

Verified against the live project: `GET`, `POST` and `DELETE` on every table
with the publishable key all return `401 insufficient_privilege`. The check runs
in `npm run db:check` and in `tests/integration/security.test.ts`.

### The application role bypasses RLS — and that is a known trade-off

The application connects as `postgres`, which holds the `BYPASSRLS` attribute.
Prisma's queries are therefore **not** filtered by RLS. The effective
administrator gate is the session cookie described above, not the database.

This is a deliberate, documented deviation from the original plan, which asked
for RLS to restrict access to authorised administrators. It was chosen because
the project owner asked for a single hard-coded credential with no
authentication provider, and because Prisma 7 requires a driver adapter that
connects with a fixed role.

**Hardening path**, if the application is ever exposed to more than one person
or the database password is ever at risk:

1. create a dedicated role, for example `cheeti_app`, with `NOSUPERUSER` and
   `NOBYPASSRLS`;
2. grant it `SELECT, INSERT, UPDATE, DELETE` on the application tables only;
3. add an RLS policy for that role that checks a per-transaction
   `request.jwt.claims` value, and set that value from the server on every
   connection;
4. point `DATABASE_URL` at that role instead of `postgres`.

The application code would not need to change, because all access already goes
through the Prisma client in `src/lib/db.ts`.

### The audit trail is append-only

`audit_logs` has **no `UPDATE` or `DELETE` policy for any role**, and a trigger
raises an exception on any attempt to modify or delete a row — including from
the application role. Verified by the integration tests, which assert that both
operations are rejected.

Every payment, reversal, member change, obligation change, payout change and
round change is written to the trail with the values before and after the
change.

---

## 5. Input validation

Every server action validates its input with Zod before touching the database:
identifiers must be UUIDs, amounts must be positive and within a sane limit,
the payment method must be one of the four supported values, and the receipt
date must parse as a date and time in Asia/Kolkata.

Amounts are converted from rupees to paise exactly once, at the input
boundary, and stored as `BIGINT`. There is no floating point arithmetic in the
financial path.

---

## 6. Duplicate submissions

`payments.idempotency_key` has a unique index. The payment form generates a
random key when it is opened and reuses it for every retry, so a double tap, a
retry after a network error, or two impatient taps cannot record the same
money twice. The server looks the key up before writing, and the unique index
is the final guarantee.

The insert is scoped to its own transaction because PostgreSQL aborts a
transaction that hits a constraint violation; without that, the recovery
lookup after a duplicate would fail.

---

## 7. What is *not* protected

Honest limitations:

| Risk | Status | Recommendation |
|---|---|---|
| Weak administrator password | The password in use is short and has been shared in a chat transcript | **Rotate it before the application is deployed publicly** |
| No second factor | Single password only | Add a second administrator or Vercel deployment protection |
| Rate limiter is per instance | Online guessing is slowed, not prevented | Vercel deployment protection, or a shared limiter |
| The database password is in the environment | Standard for server-side apps | Rotate it from the Supabase dashboard; the app picks up the new value on the next deploy |
| No secret manager | Environment variables hold the secrets | Vercel environment variables are encrypted at rest and hidden from the build log |
| Backups contain personal information | Backups are written to disk | `backups/` is gitignored; keep the files somewhere private |

---

## 8. Deployment protection

The application has exactly one password. If the URL is known to anyone else,
Vercel's **deployment protection** (a password in front of the whole site) is
worth enabling. It is a second locked door for a tool that was designed to be
used by one person.

---

## 9. Verification

Run these to confirm the security posture is still intact:

```bash
npm run db:check      # connectivity, plus the publishable-key probe
npm test              # includes the RLS and audit-trail tests
npm run e2e -- <url>  # login, session, and the protected screens
```

The RLS and audit tests run against the live database inside a transaction that
is always rolled back, so they never change the data.

---

## 10. Reporting a problem

This is a private, single-user application. If a security issue is found, do
not publish the details anywhere public — record it in the audit trail notes
and fix it in a new migration.
