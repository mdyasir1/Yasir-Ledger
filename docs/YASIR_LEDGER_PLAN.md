# Yasir Ledger

## Project plan, design specification and build record

**Project owner:** Yasir
**Application:** Yasir Ledger, a cheeti contribution scheme manager
**Scheme period:** October 2026 to July 2027
**Currency:** Indian Rupee (INR)
**Timezone:** Asia/Kolkata
**Document version:** 3
**Last updated:** 2026-10-21

This is the single reference document for the project. It holds the product
requirements, the design system, the data model, the security model, the
operating procedures, the deployment steps, the user guide, and a record of how
the application was built. Anyone picking the project up, human or otherwise,
should be able to read this and continue the work without any other file.

---

## Contents

1. [What the application is](#1-what-the-application-is)
2. [Branding and design system](#2-branding-and-design-system)
3. [The scheme](#3-the-scheme)
4. [Payout schedule](#4-payout-schedule)
5. [Data model](#5-data-model)
6. [Authentication and security](#6-authentication-and-security)
7. [The screens](#7-the-screens)
8. [Financial rules](#8-financial-rules)
9. [Testing](#9-testing)
10. [Backup and restore](#10-backup-and-restore)
11. [Deployment](#11-deployment)
12. [Using the application](#12-using-the-application)
13. [How it was built](#13-how-it-was-built)
14. [Repository map](#14-repository-map)
15. [Decisions and deviations](#15-decisions-and-deviations)
16. [Outstanding work](#16-outstanding-work)

---

## 1. What the application is

A private, mobile first web application for managing a cheeti. A cheeti is a
monthly contribution scheme: every member pays a fixed amount each month, the
round collects a fixed total, and the money is disbursed to the members
scheduled for that month.

The application answers four questions quickly:

- Who has paid this month, and who has not?
- How much has been collected, and how much is still outstanding?
- Who is due a payout, and how much has actually been handed over?
- What is the complete history of every rupee that moved?

Every figure is read from a real Supabase PostgreSQL database at the moment the
screen renders. Nothing is hardcoded, no sample data is displayed as if it were
real, and no financial total is ever stored as an independently editable value.

The primary user is the administrator, Yasir, who runs the scheme and records
the payments that members make. The whole workflow is designed around being
completed on a phone in a few seconds, between other tasks.

### Non goals for the first release

- No bank integration. Payments are recorded by hand after the administrator
  has seen them in the bank or received a notification.
- No multi user roles or signup. There is one administrator.
- No offline payment writes. Synchronisation, duplicate prevention and conflict
  resolution are all hard problems, so the application refuses to pretend it
  can do them. When the device is offline the form says so plainly and nothing
  is written.
- No notifications that are sent automatically. Reminders are composed from
  live data, edited by the administrator, and sent by hand.

---

## 2. Branding and design system

### 2.1 Identity

| Element | Value |
|---|---|
| Product name | Yasir Ledger |
| Description | Cheeti contribution scheme manager |
| Scheme name | Cheeti |
| Owner | Yasir |
| Owner credit | Managed by Yasir |
| Login credit | Organized and managed by Yasir |
| Currency | INR |
| Locale | en-IN |
| Timezone | Asia/Kolkata |
| Monogram | The letter Y, drawn in type |

The product name was chosen during the build. The earlier working name was
"Cheeti Manager". The owner asked for a product that reads like a professional
tool, while the word cheeti stays in the interface as the description of what
the tool is for. All branding lives in `src/config/app.ts`, so it can be
changed in one place.

The credit is deliberately understated. It appears in the application footer and
on the login page, never inside a member row, a payment record or a receipt.
Nothing in the branding implies government approval, bank affiliation,
financial certification or regulatory endorsement.

### 2.2 Design language

The interface is a quiet financial surface. Warm paper background, pure white
cards, hairline borders, one deep ink accent, and colour used only where it
carries meaning. The reference points are modern financial tooling rather than
consumer dashboards: dense but calm, no decoration, no gradients on content,
no charts that do not earn their place.

**Colour tokens** live in `src/app/globals.css` under `:root` and `.dark`.

| Token | Light | Purpose |
|---|---|---|
| `--background` | `oklch(0.983 0.003 95)` | Page surface, warm off white |
| `--card` | `oklch(1 0 0)` | Card and panel surface, pure white |
| `--foreground` | `oklch(0.222 0.014 268)` | Primary text, deep ink |
| `--muted-foreground` | `oklch(0.528 0.014 268)` | Secondary text |
| `--primary` | `oklch(0.276 0.045 274)` | The single accent, deep ink blue |
| `--brand-panel` | `oklch(0.262 0.042 272)` | The login brand panel, deep in both themes |
| `--border` | `oklch(0.916 0.005 95)` | Hairlines |
| `--destructive` | `oklch(0.588 0.19 25)` | Money outstanding, errors |

Semantic colour is reserved for state and never used decoratively:

| Meaning | Colour |
|---|---|
| Paid, collected, positive | Emerald, `text-emerald-600` |
| Partially paid, needs attention | Amber, `text-amber-600` |
| Outstanding, critical, destructive | Red, `text-destructive` |
| Overpaid, reversal entries | Violet, `text-violet-700` |

**Typography.** Three families, all loaded through `next/font`, so there are no
layout shifts and no third party requests at runtime.

| Role | Family | Use |
|---|---|---|
| Display | Inter Tight | Headings, figures, the wordmark. Tight tracking, `[-0.02em]` to `[-0.032em]` |
| Text | Inter | Body copy, labels, table cells |
| Mono | JetBrains Mono | Transaction references and technical identifiers only |

Three utility classes carry the typographic system:

- `.display` sets the display family and tight tracking.
- `.numeric` forces tabular figures with slightly negative tracking, so every
  column of amounts lines up exactly. It is applied to every money figure.
- `.eyebrow` is the small uppercase label used above figures and section
  titles, at 11px with wide tracking.

**Surfaces.** Cards are white with a single hairline ring at six percent ink and
a very soft shadow defined by the `--shadow-card` token. Tables sit inside the
same treatment rather than being bordered boxes of their own.

**Dark mode** is supported and follows the system preference on first visit.
The choice is stored in `localStorage` under `yl-theme` and applied by a small
inline script in the root layout, so the very first frame is already correct
and there is no flash. The toggle lives in the sidebar footer on a desktop, in
the top bar on a phone, and in the corner of the login page, so the theme can
be chosen before signing in. The icon is chosen by CSS rather than by React
state, so there is no hydration mismatch and the component holds no state.

**The login brand panel** uses its own token, `--brand-panel`, rather than
`--primary`. The primary colour inverts in dark mode, so a panel built on it
would become a near-white block with white type on it. The brand panel stays
deep in both themes, and in dark mode it is a little deeper than the page
background, so the split reads as two deliberate surfaces.

**Native widgets follow the theme.** `color-scheme` is declared as `light` on
the root and `dark` on the dark root, so the date picker, the scrollbars, the
select dropdowns and autofilled fields all render in the right palette. Chrome
paints its own background over an autofilled field, so the autofill background
is covered with the card colour and the text colour is restored.

**Motion** is minimal by design. The splash screen fades and rises in once, the
collection progress bar animates its width, and everything else is instant. All
animation respects `prefers-reduced-motion`.

**Touch targets** are at least 36px on desktop and 44px or more for primary
actions on a phone, which satisfies the requirement for large touch targets.

### 2.3 The password field

The password field carries a reveal button inside the field on the right, so
the control never shifts the layout. It is a real button with a label and a
pressed state, so it is reachable by keyboard and announced correctly. The
component lives in `src/components/password-input.tsx` and is used by the
login form.

### 2.4 The splash screen

The application opens on a branded splash while the session is verified and the
first screen loads.

- A monogram: the letter Y in a rounded square, drawn in type, so it is crisp
  at every density and costs no request.
- Below it the product name in the display family, then the description.
- Below that a slim indeterminate loader.
- A soft radial gradient behind the mark, drawn in CSS.

The splash is the loading state of the authenticated shell and of the login
page. It appears once per load, never on every navigation, and it never traps
the user.

---

## 3. The scheme

### 3.1 Configuration

| Setting | Value |
|---|---|
| Rounds | 10, October 2026 to July 2027 |
| Members | 17 |
| Monthly collection target | Rs 1,00,000 |
| Initial administrator | Yasir |

### 3.2 Members and default contributions

| Member | Default monthly contribution |
|---|---:|
| Yasir | Rs 10,000 |
| Ibrahim | Rs 10,000 |
| Rahima | Rs 10,000 |
| Fatima | Rs 5,000 |
| Rahila | Rs 5,000 |
| Hidayat | Rs 8,000 |
| Sajidh | Rs 2,000 |
| Zeenata Badeami | Rs 12,500 |
| Arshad Badeami | Rs 5,000 |
| Khaise | Rs 2,500 |
| Zaakir Aapa | Rs 2,500 |
| Afsar | Rs 2,500 |
| Farhat | Rs 5,000 |
| Shakir | Rs 10,000 |
| Zeenat Aunty | Rs 2,500 |
| Sumayya | Rs 2,500 |
| Munni Aunty | Rs 5,000 |
| **Total** | **Rs 1,00,000** |

The seventeen amounts were checked by hand and by script before any part of the
payment engine was written. The check is part of the release gate, described in
section 9.3.

### 3.3 Money representation

Every monetary column is an integer number of **paise** in a `BIGINT` column.
Rs 1,00,000 is `10000000`. There is no floating point and no decimal anywhere
in the financial path.

- Amounts are converted from rupees to paise exactly once, at the input
  boundary, and rounded half up at that point.
- Every amount in the scheme is a whole multiple of Rs 500, so no rounding rule
  is ever actually needed.
- Prisma exposes these columns as `BigInt`. The application converts them to
  JavaScript numbers at the data transfer boundary. The largest value a double
  can hold exactly is about Rs 21 crore, which is far beyond the lifetime total
  of the scheme, so the conversion is safe.
- Formatting always uses `Intl.NumberFormat` with `en-IN` and `INR`.

### 3.4 Contribution obligations

Every member has an obligation in every round, seeded from their default
contribution. This is the only configuration under which each round's
obligations add up to exactly Rs 1,00,000.

- Editing a member's default contribution never changes an existing
  obligation. Obligations are edited explicitly, one member and one round at a
  time.
- An obligation can be marked as not applicable for a round, which produces the
  "Not applicable" status for that member in that round.
- A member added later is never back-filled into earlier rounds.
- A round's expected collection is always the sum of its applicable
  obligations. It is never the configured target and never the amount that
  happens to have been paid.

### 3.5 Data initialisation rules

- The seed is repeatable and idempotent. Running it again changes nothing.
- Members are found by a stable `slug`, never by name.
- Existing rows are never overwritten, so administrator edits survive a
  re-seed.
- Phone numbers are optional.
- The `payments` table is never seeded. The application contains no fabricated
  financial history.

---

## 4. Payout schedule

| Month | Recipient or recipients | Planned amount each | Round total |
|---|---|---|---:|
| October 2026 | Yasir | 10,000 | 10,000 |
| November 2026 | Ibrahim | 10,000 | 10,000 |
| December 2026 | Fatima, Rahila | 5,000 + 5,000 | 10,000 |
| January 2027 | Hidayat, Sajidh | 8,000 + 2,000 | 10,000 |
| February 2027 | Zeenata Badeami | 12,500 | 12,500 |
| March 2027 | Arshad Badeami, Khaise, Zaakir Aapa | 5,000 + 2,500 + 2,500 | 10,000 |
| April 2027 | Zeenata Badeami, Afsar, Farhat | 12,500 + 2,500 + 5,000 | 20,000 |
| May 2027 | Rahima, Rahila | 10,000 + 5,000 | 15,000 |
| June 2027 | Shakir | 10,000 | 10,000 |
| July 2027 | Zeenat Aunty, Sumayya, Munni Aunty | 2,500 + 2,500 + 5,000 | 10,000 |

Rules:

- Several recipients in one month are supported, each with their own amount.
- `planned_amount` and `actual_amount` are stored separately. The application
  never derives one from the other.
- A round's total planned payout is not expected to equal that round's
  collection target, and no warning is raised merely because they differ.
- The planned amounts in the table are starting values. The administrator edits
  them on the Timeline screen before the first disbursement.
- "Apsar" in the original schedule was confirmed by the owner to be a typo for
  **Afsar**, the member who contributes Rs 2,500. April 2027 is seeded with
  Zeenata Badeami, Afsar and Farhat.

---

## 5. Data model

Nine tables, defined in `prisma/schema.prisma` and created by the SQL in
`supabase/migrations/`.

### 5.1 `members`

`id`, `slug`, `full_name`, `phone_number` (nullable),
`default_contribution_amount`, `is_active`, `notes`, `created_at`,
`updated_at`.

### 5.2 `monthly_rounds`

`id`, `year`, `month`, `round_name`, `collection_target`, `status`, `notes`,
`created_at`, `updated_at`. Unique on `(year, month)`.

### 5.3 `contribution_obligations`

`id`, `round_id`, `member_id`, `expected_amount`, `is_applicable`, `notes`,
`created_at`, `updated_at`. Unique on `(round_id, member_id)`.

### 5.4 `payments`

`id`, `round_id`, `member_id`, `amount`, `payment_method`, `received_at`,
`transaction_reference` (nullable), `note` (nullable), `idempotency_key`,
`created_by`, `reversal_of_payment_id` (nullable), `created_at`.

- `idempotency_key` is unique. This is the database level guarantee against a
  duplicate submission.
- `amount` must be greater than zero.
- `reversal_of_payment_id` points at the payment being reversed, and a check
  constraint prevents a row reversing itself.
- `created_by` holds a single fixed actor identifier,
  `00000000-0000-4000-8000-000000000001`, because there is exactly one
  administrator. The column stays a UUID so a future multi user version needs
  no migration.

### 5.5 `payouts`

`id`, `round_id`, `recipient_member_id`, `planned_amount`, `actual_amount`
(nullable), `status`, `paid_at` (nullable), `transaction_reference` (nullable),
`note`, `created_at`, `updated_at`. Unique on `(round_id, recipient_member_id)`.

### 5.6 `share_groups` and `share_group_members`

`share_groups` holds `id`, `name`, `target_share_amount`, `is_active`,
`created_at`, `updated_at`.

`share_group_members` holds `id`, `share_group_id`, `member_id`,
`allocated_amount`, `effective_from_round_id` (nullable),
`effective_until_round_id` (nullable), `created_at`, `updated_at`. Unique on
`(share_group_id, member_id)`.

These tables describe people who combine their contributions to form a larger
share, for example Rs 5,000 plus Rs 5,000. A share group never replaces an
individual obligation and never replaces a payment.

### 5.7 `audit_logs`

`id`, `actor_id` (nullable), `action`, `entity_type`, `entity_id` (nullable),
`before_data` (nullable jsonb), `after_data` (nullable jsonb), `created_at`.

The trail is append only. It is written for every payment, reversal, member
change, obligation change, payout change and round change.

### 5.8 Constraints and indexes

- Every money column is `BIGINT` with a check constraint that rejects negative
  values. `payments.amount` additionally requires a value greater than zero.
- Indexes exist on every foreign key, on `payments.received_at`, on
  `payments (round_id, member_id)` for the collections screen, and on the audit
  trail's entity and date columns.
- `updated_at` is maintained by a `BEFORE UPDATE` trigger on every table that
  has one.

### 5.9 How the schema is managed

- The **source of truth for the schema** is hand authored, version controlled
  SQL in `supabase/migrations/`, named with a timestamp and a description.
- `scripts/migrate.mjs` applies them in order, each inside a transaction, and
  records every file in a `schema_migrations` ledger with a checksum. A file
  whose contents changed after it was applied is reported as an error rather
  than silently re-applied.
- Prisma's own `migrate dev` is not used, because it needs a shadow database
  that the Supabase free tier does not allow creating.
- `prisma/schema.prisma` mirrors the migrated schema and produces the typed
  query client. It is the query layer, not the migration layer.
- `prisma db pull` is the drift check. It was run during the build and showed
  no difference between the schema file and the live tables.

### 5.10 Seed

`supabase/seed.sql` is idempotent and can be run from the SQL editor or with
`npm run db:seed`.

| Table | Rows |
|---|---:|
| members | 17 |
| monthly_rounds | 10 |
| contribution_obligations | 170 |
| payouts | 19 |
| payments | 0 |

---

## 6. Authentication and security

### 6.1 The model

There is one user. The application has no accounts, no roles and no signup.

- The administrator's email and password live in server only environment
  variables, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Neither uses a
  `NEXT_PUBLIC_` prefix, so neither can reach the browser bundle.
- The login form compares them with `crypto.timingSafeEqual` over SHA-256
  digests, so the comparison time does not depend on the value or on how much
  of it matched. Both halves are always compared.
- A successful login issues a stateless signed session cookie:
  `base64url(payload).base64url(HMAC-SHA256(payload))`, where the payload is
  `{ email, issuedAt, expiresAt }`.
- The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production,
  and lives for seven days with sliding renewal.
- Rotating `SESSION_SECRET` invalidates every session at once.
- The login endpoint allows five failed attempts per client address per fifteen
  minutes. The limiter is in process, so on a serverless platform it is per
  warm instance rather than global.

### 6.2 Route and action protection

Two independent layers:

1. `src/proxy.ts`, the Next.js 16 replacement for `middleware.ts`, redirects
   any unauthenticated request to `/login` and preserves the requested path.
2. Every server action re-verifies the session before it writes anything.

The second layer is not redundant. A Server Function is a POST to the route it
belongs to, and a request that arrives by any other route must not be able to
write. The authenticated layout re-checks the session as well, so a protected
page can never render for a signed out visitor.

### 6.3 Row Level Security

`supabase/migrations/0002_row_level_security.sql`:

- RLS is **enabled and forced** on all eight financial tables.
- Every table, sequence and function privilege is **revoked** from `anon` and
  `authenticated`.
- **No policy is created** for those roles.

With RLS enabled and no matching policy, those roles see zero rows and every
write is rejected. This matters because the project's publishable key is public
by nature. It is in the dashboard, and it must never be a way into the
financial data.

Verified against the live project: `GET`, `POST` and `DELETE` on every table
with the publishable key all return `401 insufficient_privilege`. The check
runs in `npm run db:check` and in the integration tests.

### 6.4 The known trade-off

The application connects as `postgres`, which holds the `BYPASSRLS` attribute.
Prisma's queries are therefore **not** filtered by RLS. The effective
administrator gate is the session cookie, not the database.

This is a deliberate, documented deviation from the original plan, which asked
for RLS to restrict access to authorised administrators. It was chosen because
the owner asked for a single hard coded credential with no authentication
provider, and because Prisma 7 requires a driver adapter that connects with a
fixed role.

**Hardening path**, for the day the application is exposed to more than one
person or the database password is at risk:

1. create a dedicated role, for example `cheeti_app`, with `NOSUPERUSER` and
   `NOBYPASSRLS`;
2. grant it `SELECT, INSERT, UPDATE, DELETE` on the application tables only;
3. add an RLS policy for that role that checks a per transaction
   `request.jwt.claims` value, and set that value from the server on every
   connection;
4. point `DATABASE_URL` at that role instead of `postgres`.

The application code would not need to change, because every read and write
already goes through the Prisma client in `src/lib/db.ts`.

### 6.5 The audit trail

`audit_logs` has no `UPDATE` or `DELETE` policy for any role, and a trigger
raises an exception on any attempt to modify or delete a row, including from
the application role. The integration tests assert that both operations are
rejected.

### 6.6 Input validation

Every server action validates its input with Zod before touching the database.
Identifiers must be UUIDs, amounts must be positive and within a sane limit,
the payment method must be one of the four supported values, and the receipt
date must parse as a date and time in Asia/Kolkata.

### 6.7 Duplicate submissions

`payments.idempotency_key` carries a unique index. The payment form creates a
random key when it is opened and reuses it for every retry, so a double tap, a
retry after a network error, or two impatient taps cannot record the same money
twice. The server looks the key up before writing, and the unique index is the
final guarantee.

The insert runs inside its own transaction, because PostgreSQL aborts a
transaction that hits a constraint violation. Without that, the recovery lookup
after a duplicate would fail. This was a real bug found during the build.

### 6.8 What is not protected

| Risk | Status | Recommendation |
|---|---|---|
| Weak administrator password | The password in use is short and has been shared in a chat transcript | Rotate it before the application is deployed publicly |
| No second factor | Single password only | Add deployment protection in front of the site |
| Rate limiter is per instance | Online guessing is slowed, not prevented | Vercel deployment protection, or a shared limiter |
| The database password is in the environment | Standard for a server side application | Rotate it from the Supabase dashboard and update the two URLs |
| No secret manager | Environment variables hold the secrets | Vercel environment variables are encrypted at rest |
| Backups contain personal information | Backups are written to disk | `backups/` is gitignored and must stay out of git |

---

## 7. The screens

Six screens, all reading live data.

### 7.1 Dashboard

The selected round, the expected total, the amount collected, the amount
outstanding, the counts of paid, partially paid and pending members, the
collection progress bar, the next scheduled recipients with planned and actual
payout totals, the most recent transactions, the members who need a reminder,
and the reconciliation warnings.

### 7.2 Collections

Every member for the selected round with their expected amount, what they have
paid, their outstanding balance, their status, the date of their last payment,
and the full payment history. Filters for all, pending, partially paid, paid,
overpaid and not applicable, plus a search box on the member's name. Members
who still owe money are sorted to the top. The record action opens a form with
the full outstanding balance already filled in, and the resulting balance is
shown before saving. A reminder action opens a message built from the recorded
figures, with Call and WhatsApp shortcuts when a phone number is on file.

On a phone each member is a compact card. On a wide screen the same data is a
table.

### 7.3 Members

Each member with their default contribution, phone number, active state, what
they have contributed across the scheme, what they still owe, their payment
count and the date of their last payment. Member details can be edited and new
members added.

### 7.4 Timeline

All ten rounds. Each card shows the scheduled recipients with their planned
amounts, the planned total, the amount actually disbursed, what the round
collected, what is still outstanding, and the counts of paid, partial and
pending members. Recipients can be added, removed and edited.

### 7.5 Transactions

The complete ledger with filters for month, member, payment method, date range
and status. The status filter can narrow the list to the entries that count
towards the collection. The filtered rows export to CSV, and a wrong entry can
be reversed after a confirmation.

### 7.6 Settings

The scheme configuration, the ten rounds with their status and target, and the
about text. A round can be opened or closed, and its target and notes edited.

### 7.7 Navigation

Desktop uses a fixed sidebar. A phone uses a compact bottom navigation bar.
The selected month is kept in the URL, so every screen follows the same choice
and a screen can be linked to directly.

---

## 8. Financial rules

All of this lives in `src/lib/finance/`, as pure functions with no React, no
Next.js and no database. That is what makes the rules testable.

### 8.1 Payment status

| Status | Rule |
|---|---|
| Not paid | No valid payment received and an amount is due |
| Partially paid | Some money received, the expected amount not fulfilled |
| Paid | The expected contribution fulfilled exactly |
| Overpaid | Valid payments exceed the expected contribution |
| Not applicable | No contribution is due from that member for that round |

The status is computed per member from their obligation and their own valid
payments. A member is never marked paid because the round total is
sufficient, and paid members are never counted by dividing a total by a fixed
amount.

Worked example from the plan: Fatima owes Rs 5,000 and pays Rs 2,500, so her
status is partially paid with Rs 2,500 outstanding. When she pays the
remaining Rs 2,500 her status becomes paid, and both transactions stay visible.

### 8.2 Outstanding balance

Only positive balances are outstanding. An overpaid member has nothing
outstanding, and their surplus is never netted against another member.

### 8.3 Reversals

A reversal never deletes anything. A compensating entry is written that points
at the original, and both the original and the reversal are excluded from the
collection totals. The full history stays visible in the ledger, marked as
reversed or as a reversal entry.

### 8.4 Reconciliation warnings

A short collection is a note while a round is open, and critical once it is
closed. A payout larger than what was collected is always critical. A
collection above the expected amount, a planned payout above the collection, an
actual payout above the planned amount, and any member who overpaid are all
reported.

### 8.5 Timezone

The scheme runs in Asia/Kolkata. The server may run in any timezone, and Vercel
runs in UTC, so a date entered by the administrator is read as wall clock time
in Asia/Kolkata and stored as the correct UTC instant. A payment recorded at
2:30 pm is not stored five and a half hours out. The conversion lives in
`src/lib/datetime.ts` and is covered by unit tests.

---

## 9. Testing

### 9.1 The layers

| Layer | What it covers | Database |
|---|---|---|
| Unit | All financial logic, formatting, timezone, session tokens, rate limiting | None |
| Integration | Server actions against the real schema | Live database, inside a rolled back transaction |
| End to end | The real login form over HTTP, then every protected screen | Live database, read only |
| Layout | Every screen, in both themes, at phone, tablet and desktop sizes, including a contrast check that catches text drawn in the wrong colour | Live database, read only |

### 9.2 The integration tests never touch the real data

Every integration test runs inside a Prisma interactive transaction that is
always rolled back. The runner forces the rollback by throwing a sentinel
error. `src/lib/db.ts` exports `withClient`, which swaps the shared Prisma
client for the transaction's client, so the application's own server actions
run against the transaction rather than the committed database.

The suite was checked afterwards against the live database: the row counts were
unchanged, the audit trail was empty, and no test rows were left behind.

Because the administrator started recording real payments, the payment tests
were moved onto a transient round of their own, so their assertions do not
depend on what has already been recorded. One separate test covers a
historical transaction in the genuine October 2026 round.

### 9.3 The release gate

`npm run db:verify` asserts the seeded scheme against the live database:

- exactly 17 members, with unique slugs
- the member defaults total exactly 10,000,000 paise, which is Rs 1,00,000
- no negative default contribution
- exactly 10 rounds, one per month from October 2026 to July 2027
- every round's target is 10,000,000 paise
- exactly 170 obligations, one per member per round
- every round's applicable obligations total exactly 10,000,000 paise
- every obligation matches the member's default contribution
- exactly 19 payouts, matching the schedule in section 4
- the seed creates no payment history
- RLS is enabled on all eight tables, with no policy for `anon` or
  `authenticated`

The payment engine was not started until this gate passed.

### 9.4 The test cases

| # | Requirement | Where it is covered |
|---|---|---|
| 1 | Full payment | Unit and integration |
| 2 | Partial payment | Unit and integration |
| 3 | Multiple payments by one member | Unit and integration |
| 4 | Correct outstanding balance | Unit |
| 5 | Overpayment | Unit and integration |
| 6 | Duplicate submission prevention | Integration, unique index |
| 7 | Payment reversal | Unit and integration |
| 8 | Several recipients in a month | Unit and integration |
| 9 | Historical October transactions | Integration |
| 10 | Correct monthly totals | Unit and integration |
| 11 | Failed network requests | Unit, server action error handling |
| 12 | Authentication and RLS | Integration and end to end |
| 13 | Responsive mobile layouts | Layout checks in a real browser, in both themes |
| 14 | Reconciliation calculations | Unit |
| 15 | Repeatable seed, no duplicate records | Integration and `db:verify` |

### 9.5 Commands

```bash
npm run lint          # ESLint, flat config, zero problems
npm run typecheck     # tsc --noEmit
npm test              # 100 tests
npm run build         # production build
npm run db:check      # connectivity and the publishable key probe
npm run db:verify     # the scheme release gate
npm run e2e -- <url>  # the real login form and every protected screen
npm run visual -- <url>  # 168 layout and theme checks in a real browser
```

The layout check found three real defects during the build, all of them fixed:
every select showed its raw value instead of a label, so the month picker
displayed a UUID. The mobile navigation wrapped onto a second row. And the
integration tests broke as soon as the administrator recorded real payments.

The check was then extended to run every screen in the dark theme as well, and
to confirm that text and the surface behind it are different colours. That
immediately found the login brand panel drawing white type on a near-white
panel in dark mode, and the input fields washing out because a translucent
white override was still in place.

---

## 10. Backup and restore

The database is the only system of record. Eight tables hold everything:
`members`, `monthly_rounds`, `contribution_obligations`, `payments`, `payouts`,
`share_groups`, `share_group_members` and `audit_logs`.

### 10.1 Two kinds of backup

| Kind | What it is | How to restore |
|---|---|---|
| Supabase's own | Platform managed daily snapshots, under Settings, Database, Backups in the dashboard | Restore the whole database from the dashboard |
| Application backup | A JSON file produced by `npm run db:backup` | `npm run db:restore -- <file>` |

Use both. The platform backup protects the whole database. The application
backup is portable, readable, and can be restored into a different project.

### 10.2 Taking a backup

```bash
npm run db:backup
npm run db:backup -- backups/before-the-july-round.json
```

The file is written to `backups/`, which is gitignored. Backups contain member
names, phone numbers and payment history, so they must stay somewhere private.

### 10.3 Restoring

```bash
npm run db:restore -- backups/yasir-ledger-2026-10-21T07-35-14-149Z.json
```

The whole restore runs inside one transaction, so a failure leaves the database
exactly as it was. Each table is emptied and repopulated in dependency order.
`audit_logs` is different: the existing rows are never deleted or modified,
because the trail is append only. Missing rows are added back so the history is
complete, but the trail can never be rewritten.

The restore replaces the current data. Take a fresh backup first if unsure.

### 10.4 A schedule that works

- At the end of each round, from October 2026 to July 2027, run
  `npm run db:backup` and copy the file somewhere private.
- Before any risky change, such as editing member defaults in bulk or applying
  a new migration, take a backup first.
- After July 2027, take a final backup and keep it. The data is the record of
  who paid what.

### 10.5 Recovering from a mistake in the application

Most mistakes do not need a restore.

| Mistake | How to undo it |
|---|---|
| A payment was recorded in error | Transactions, then the row, then Reverse. The original stays in the ledger and is excluded from the totals |
| The wrong amount was entered | Reverse it, then record the correct payment. Both entries stay visible |
| A member's name or phone number is wrong | Members, then Edit. Nothing else is affected |
| A member's default contribution is wrong | Members, then Edit. Past obligations and payments are deliberately unchanged |
| An obligation is wrong for one month | Collections, then the member, then edit the obligation |
| A recipient is wrong for a month | Timeline, then the month, then remove or add the recipient |

A restore is only needed if the database itself is damaged.

### 10.6 What a backup does not cover

The environment variables, including `ADMIN_PASSWORD`, `SESSION_SECRET` and
the database password. Keep a copy of `.env.local` somewhere private. The
Vercel deployment lives in git, so a redeploy restores it. The Supabase project
settings live in the dashboard.

---

## 11. Deployment

### 11.1 Steps

1. Import the repository into Vercel. The framework preset is Next.js and the
   build commands are detected automatically.
2. Set the environment variables below under Project, Settings, Environment
   Variables. They are encrypted at rest and are not printed in the build log.
3. Apply the migrations to the hosted database from your own machine:

   ```bash
   npm run db:migrate
   npm run db:seed     # only on a brand new project
   npm run db:verify
   ```

   The schema is not applied by the build on purpose. A build should not be
   able to change a production database.
4. Deploy. The build runs `npm install`, which generates the Prisma client, and
   then `next build`.
5. Open the deployment, sign in, and check that the dashboard shows Rs 1,00,000
   expected for October 2026.
6. Run the end to end check against the deployment:

   ```bash
   npm run e2e -- https://your-deployment.vercel.app
   ```

### 11.2 Environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` |
| `ADMIN_EMAIL` | The administrator's email |
| `ADMIN_PASSWORD` | A strong password, different from the development one |
| `SESSION_SECRET` | 32 or more random bytes, hex encoded. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. It signs the session cookie, so it must be different for production, and it must never be reused or committed |

Optional, only for the RLS check in `npm run db:check`:
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The
publishable key is public by design. The database password and
`SESSION_SECRET` are not, and must never use a `NEXT_PUBLIC_` prefix.

### 11.3 After deploying

- Rotate the administrator password, because the development value only ever
  existed in the local `.env.local`.
- Turn on deployment protection. The application has one password, so a second
  locked door in front of the whole site is worthwhile.
- Set up the backups, as described in section 10.
- Add a domain if a memorable address is wanted.

### 11.4 Diagnosing a deployment

Three mechanisms exist so that a misconfigured deployment explains itself
instead of showing a blank error page.

**The platform log.** `src/instrumentation.ts` runs once per server instance,
before the first request. If a required variable is absent it writes a single
line:

```
[Yasir Ledger] Missing environment variables: DATABASE_URL
```

**The diagnostic endpoint.** `GET /api/health` reports the state of a
deployment. It is excluded from the route guard so it can answer with JSON,
and it checks the session itself, returning `401` without a valid cookie, so it
stays private. The response carries the presence of each required variable by
name and never its value, whether the database can be reached, the round trip
time, and the sanitised error.

```json
{
  "status": "error",
  "environment": { "DATABASE_URL": "missing", "DIRECT_URL": "present" },
  "missing": ["DATABASE_URL"],
  "database": {
    "reachable": false,
    "latencyMs": 42,
    "error": "Missing required environment variable: DATABASE_URL."
  }
}
```

That last field is the point. It separates a variable that is absent from a
variable that is present but whose connection fails, which are two different
problems that look identical from a browser.

**The error screen.** `src/app/(app)/error.tsx` and `src/app/global-error.tsx`
replace the bare platform error page with a branded panel that explains what
went wrong in plain language, shows the error, gives the log reference, and
offers a retry and a link to the diagnostic. In a production build React
minifies the message of a server error and keeps the real message in the
server log under the digest, so the screen points at both places rather than
guessing.

The diagnostic endpoint is part of the layout check, so a deployment that is
missing a variable fails the check rather than the browser.

### 11.5 Config or Secret

Vercel offers two types for every environment variable. **Config** values stay
readable to project members after saving. **Secret** values are write-only
after saving and are redacted from build logs. The type changes nothing about
which environments receive the value, or about what the application can read
at runtime. All values are encrypted at rest either way.

The rule for this project:

| Variable | Type | Reason |
|---|---|---|
| `DATABASE_URL` | Config | The value has to be read back to verify it when a deployment misbehaves, and it is never sent to a browser because it has no `NEXT_PUBLIC_` prefix |
| `DIRECT_URL` | Config | Same |
| `ADMIN_EMAIL` | Config | Not a secret, and it is useful to be able to check which identity a deployment is using |
| `ADMIN_PASSWORD` | Secret | A password that never needs to be read back |
| `SESSION_SECRET` | Secret | A key that never needs to be read back. Rotating it signs out every session |

Two Vercel rules matter. A saved Secret cannot be converted to a Config in
place, it has to be deleted and re-created. And a change to any environment
variable applies only to new deployments, so a redeploy is always required
after an edit.

### 11.6 Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Missing required environment variable: DATABASE_URL" | The variable is not set for that environment. Apply it to Production and redeploy |
| The dashboard shows Rs 0 | The data was not seeded, or the app is connected to a different database. Run `db:verify` against the same `DIRECT_URL` |
| "current transaction is aborted" | The connection uses a pooler that cannot hold an interactive transaction. Use the session mode pooler for `DIRECT_URL` |
| "Too many clients" | The runtime pooler is exhausted. Lower `connection_limit` and make sure the Prisma client is one instance per function |
| "prepare statement" errors | The transaction mode pooler does not support prepared statements. Keep `pgbouncer=true` |
| The login page works but every other screen shows "This page couldn't load" | The shell and the login page never touch the database, so this is always a database connection problem. Open `/api/health` in a signed-in browser, or look for the `[Yasir Ledger] Missing environment variables` line in the runtime logs |

---

## 12. Using the application

### 12.1 Signing in

Enter the administrator email and password. After five wrong attempts the form
pauses for fifteen minutes. The session lasts seven days. The sign out button
is in the sidebar on a computer and in the top bar on a phone.

### 12.2 Choosing a month

The month selector is at the top of the Dashboard and the Collections screen.
The chosen month is part of the page address, so a specific month can be
bookmarked and every screen follows the same choice.

### 12.3 Recording a payment

1. Open Collections and choose the month.
2. Find the member, using the search box or the list. Members who still owe
   money are listed first.
3. Tap Record.
4. The amount is already filled in with the full outstanding balance. Change it
   if a different amount was paid, or tap Full to put the balance back.
5. Choose how it was paid: UPI, Bank transfer, Cash or Other.
6. The Received on field is pre-filled with the current time. Change it if the
   money arrived earlier. The time is always Asia/Kolkata.
7. Add a reference or a note if wanted.
8. Check the balance after this payment, then tap Record payment.

The confirmation only appears once the database has actually stored the
payment.

If the phone is offline the form refuses to submit and says so plainly.
Nothing is stored and nothing is queued, so a payment can never silently go
missing.

### 12.4 Partial payments

A member can pay in instalments. Record each payment separately. The second
payment adds to the first, and the status moves from not paid to partially
paid to paid as the balance is cleared. Both transactions stay visible in the
member's history.

### 12.5 Sending a reminder

1. On the Collections screen, expand the member and tap Remind.
2. The message is written for you, using the figures actually recorded. For
   example: "Hi Khaise, for October 2026, your contribution is Rs 2,500. We
   have not recorded this payment yet. Please let me know when you have paid."
3. Edit the wording if wanted.
4. Use Copy to copy the message, WhatsApp to open it in WhatsApp, or Call to
   dial the member.

WhatsApp and Call only appear when the member has a phone number saved. Nothing
is ever sent automatically.

### 12.6 Fixing a mistake

Open Transactions, find the row, tap the undo button and confirm. The original
entry stays in the ledger, marked Reversed, and a matching Reversal entry is
added. Neither counts towards the collection totals, so the member's balance is
corrected immediately and the history of what happened is never lost.

To correct a member's name, phone number or default contribution, use Members
then Edit. Changing the default deliberately does not change any past month's
obligation or any payment already recorded.

### 12.7 Members

The Members screen shows every member with their default monthly contribution,
what they have paid across the whole scheme, what they still owe, and when they
last paid.

Add member creates a new member who starts with no obligations in past months,
so adding someone today never changes what the scheme looked like before
today. Give them an obligation in the current month from the Collections
screen.

Inactive marks someone who has left the scheme. Their history is kept.

### 12.8 Timeline

All ten rounds, with who is scheduled to receive money that month, how much is
planned, how much has actually been disbursed, and what the round collected.
Recipients can be added, removed and edited, and a payout can be marked as
paid with the amount, the date and a reference.

The planned amount and the amount actually disbursed are stored separately and
are never derived from one another. The planned amounts are starting values.
Check them against the actual arrangement and adjust them.

### 12.9 Transactions

The complete ledger, with filters for month, member, payment method, date
range and status. The status filter can narrow the list to the entries that
count towards the collection. Export CSV downloads the filtered rows.

### 12.10 Settings

Shows the scheme configuration, the period, the number of rounds and members,
the monthly target, and the expected total across the scheme. Each month can be
opened or closed, and its target and notes edited.

Closing a month records that a round is finished. A closed month that is short
of its expected amount is flagged as critical on the Dashboard rather than as a
note.

The target is a reference figure. The expected collection for a month is always
the sum of the obligations configured for that month, so the two can
legitimately differ.

### 12.11 A good routine

- Record each payment as it arrives rather than in a batch at the end of the
  month.
- Check the Dashboard at the start of each month to see who is outstanding.
- Send reminders early in the month.
- Take a backup at the end of each round.
- Reconcile before each payout. The reconciliation panel says whether the round
  collected what it should have.

---

## 13. How it was built

The work was done in six phases, each verified before the next one started.

### Phase 1, project setup

The repository was empty apart from the plan document. Next.js 16, React 19,
TypeScript in strict mode, Tailwind v4 and shadcn/ui were set up. Prisma 7 was
added with the `@prisma/adapter-pg` driver adapter, which uses the pure
JavaScript `pg` driver, so no native engine binary, Docker, `psql` or Python
is needed anywhere.

The authentication foundation was written at the same time: a constant time
credential check, the signed session cookie, the route guard in
`src/proxy.ts`, and the branded splash screen.

Verified: type check clean, lint clean, unit tests passing, production build
succeeding, and the route protection exercised live over HTTP.

### Phase 2, database and security

The SQL migrations were written and applied to the live Supabase project, then
the seed was written and applied. The release gate in section 9.3 was run
before any part of the payment engine existed, and it passed: Rs 1,00,000
exactly, 170 obligations, 19 payouts, no payments, and RLS denying the
publishable key on every table.

### Phase 3, financial engine

The pure financial functions were written first, with their unit tests, then
the server actions on top of them. The actions validate with Zod, check the
session, write the change and its audit entry in one transaction, and revalidate
the affected paths.

The duplicate handling bug described in section 6.7 was found by the
integration tests and fixed by scoping the insert to its own transaction.

### Phase 4, the screens

All six screens were built against live data, with the shell, the month
selector, the dialogs and the forms. The end to end script was written at this
point, and it replays the real login form rather than calling the action
directly.

### Phase 5, productivity and PWA

Search, filters, sorting, the reminder composer, the Call and WhatsApp
shortcuts, CSV export, the web app manifest, icons drawn in code, and the
offline handling.

### Phase 6, production readiness and the redesign

The documentation set was written. The layout check was then built, driving
the installed Chrome through every screen at three widths, which found three
real defects.

The final pass was a full visual redesign: a new token system, a new type
scale, restyled primitives, a dark mode, and a new login screen. The defect
found during that work was that `--color-primary` had never been mapped in the
Tailwind theme, so every `bg-primary` was transparent. The brand panel on the
login screen was rendering white on white. It is fixed and covered by the
layout check.

The owner then reported two more faults in the dark theme, both confirmed with
measured values rather than by eye. The brand panel was drawing white type on
a near-white panel, because it was built on `--primary`, which inverts in dark
mode. It now uses its own `--brand-panel` token, deep in both themes. And the
input fields were washed out, because a translucent white override was still
in place and no `color-scheme` was declared, so Chrome painted its own
autofill background. The override was removed, `color-scheme` was declared for
both themes, and the autofill background is now covered with the card colour.
A reveal button was added to the password field, and a theme toggle to the
login page.

The layout check was extended at the same time, to run every screen in both
themes and to measure the contrast between text and the surface behind it. The
bug class is now caught by the test suite rather than by eye.

The first production deployment then failed on every screen that reads the
database, while the login page and the shell worked perfectly. The cause was
a `DATABASE_URL` that was absent or wrong on the deployment. Three
mechanisms were added so that this can never again be a guessing game: the
cold-start log line, the diagnostic endpoint, and the branded error screens.
The diagnostic was also added to the layout check, so a deployment that is
missing a variable now fails a test rather than a browser.

### The method

- Every phase was verified before the next one started. The Rs 1,00,000 gate
  came before the payment engine, not after.
- The financial rules were written as pure functions first, so they could be
  tested without a database, and so they never got tangled with presentation.
- The integration tests were designed to leave the database untouched, so the
  administrator could use the real application while the suite was running.
- Anything claimed to work was checked against the running application, either
  over HTTP or in a real browser. Three UI defects and one database defect were
  found this way, none of which a type check would have caught.

---

## 14. Repository map

```
docs/YASIR_LEDGER_PLAN.md   this document
README.md                    a short introduction for Yasir

prisma/schema.prisma         the data model, produces the typed query client
prisma.config.ts             Prisma CLI configuration, loads .env.local

supabase/migrations/          version controlled SQL migrations
supabase/seed.sql             idempotent seed, also runnable from the SQL editor

scripts/load-env.mjs         shared environment loading for the scripts
scripts/migrate.mjs          applies migrations, ledger tracked
scripts/seed.mjs             runs the seed
scripts/verify-seed.mjs      the release gate
scripts/db-check.mjs         connectivity and the publishable key probe
scripts/prisma-check.ts      checks the application's own data path
scripts/backup.mjs           exports every table to JSON
scripts/restore.mjs          restores that JSON
scripts/e2e-check.mjs        the real login form and every protected screen
scripts/visual-check.mjs     54 layout checks in a real browser
scripts/generate-icons.mjs   draws the PWA icons in code

src/config/app.ts            branding, currency, locale, timezone
src/config/navigation.ts      the six screens and their icons

src/lib/server-env.ts        validated server only environment access
src/lib/db.ts                the Prisma client, and withClient for the tests
src/lib/auth.ts              credential check and the session cookie
src/lib/session.ts           token signing and verification
src/lib/rate-limit.ts        the login throttle
src/lib/money.ts             paise and rupee conversion, en-IN formatting
src/lib/datetime.ts          Asia/Kolkata parsing and formatting
src/lib/audit.ts             the append only audit trail
src/lib/action-result.ts     the shared result shape for server actions
src/lib/finance/             the pure financial rules, with their tests
src/lib/data/                the read layer, on top of Prisma

src/app/actions/             server actions: payments, members, obligations,
                             payouts, rounds
src/app/(app)/               the six screens and the authenticated shell
src/app/login/               the login page, the form and its action
src/proxy.ts                 route protection
src/components/              the shell, the dialogs, the shared pieces
src/components/ui/           the shadcn primitives
```

### Conventions worth knowing

- Money is always paise, always a `BigInt` in the database and always a
  `number` in the interface. Never a decimal.
- Financial rules never live in a component. They live in `src/lib/finance/` and
  are pure.
- Server actions always check the session, always validate with Zod, and
  always write the change and its audit entry together.
- The selected round lives in the URL as `?round=<id>`.
- The brand mark and the PWA icons are drawn from type and code, so the
  repository carries no binary assets.

---

## 15. Decisions and deviations

### 15.1 Confirmed decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Supabase is the PostgreSQL host only | Free tier project `iclzhfatzdauhktpeivi`, region `ap-southeast-1` |
| D2 | Prisma 7.10.1 with the pg driver adapter | Typed queries, version controlled migrations, and no Docker, psql, Python or native binary |
| D3 | Prisma pinned to 7.10.1 | The `latest` tag is an 8.0 release candidate |
| D4 | No Supabase JavaScript SDK | Prisma covers all data access, so there are fewer client side credentials |
| D5 | A single hard coded administrator credential and a signed session cookie | The owner's instruction: one user, no signup, no user management |
| D6 | RLS enabled on every table with no policy for anon or authenticated | The publishable key is public, so it must never be a way into the data |
| D7 | Money stored as integer paise | Exact arithmetic, and it matches the plan's preference |
| D8 | Every member has an obligation in every round | The only configuration in which each round sums to exactly Rs 1,00,000 |
| D9 | The seeded planned payout equals each recipient's own contribution | Confirmed by the owner. All values stay editable |
| D10 | Apsar is the member Afsar | Confirmed by the owner. It was a typo in the source schedule |
| D11 | Migrations are hand authored SQL applied by a Node script | Prisma's `migrate dev` needs a shadow database the free tier cannot create |
| D12 | One commit per phase | A traceable history for the migration files |
| D13 | `src/proxy.ts` replaces `middleware.ts` | Next.js 16 renamed the convention and the proxy runs on the Node runtime |
| D14 | The product was renamed to Yasir Ledger | A professional product name, with cheeti kept as the description of the scheme |
| D15 | A branded splash screen with the Y monogram | Requested by the owner. Drawn in type, so there is no image asset |
| D16 | Next.js Cache Components switched off | The whole application is authenticated and reads cookies. With Cache Components on, reading cookies outside a Suspense boundary breaks prerendering |
| D17 | A custom migration runner rather than the Prisma CLI | The Prisma CLI needs a shadow database, and `directUrl` was removed in Prisma 7 |
| D18 | A dark mode was added | A requirement of the redesign, and the tokens were written for both surfaces from the start |
| D19 | The login brand panel uses its own `--brand-panel` token | The primary colour inverts in dark mode, so a panel built on it would be white on white |
| D20 | `color-scheme` is declared for both themes | Native widgets, including the date picker and autofilled fields, follow the theme |
| D21 | The layout check covers both themes and measures text contrast | A white heading on a white panel passes a content check, so the contrast has to be measured |
| D22 | A diagnostic endpoint at `/api/health`, protected by the session | A deployment that is missing a variable must be able to say so, without exposing anything publicly |
| D23 | A cold-start check in `instrumentation.ts` | The platform log should name the missing variable in one line, rather than a stack trace deep in a page render |
| D24 | Branded error screens with a retry and a link to the diagnostic | The bare platform error page told the owner nothing actionable |
| D25 | `DATABASE_URL` is a Config variable, the password and the session secret are Secrets | The connection string has to be readable to be verified, and it is never exposed to a browser |

### 15.2 Deliberate deviations

| Plan section | Planned | Actual | Impact and mitigation |
|---|---|---|---|
| 2, 8 | Supabase Auth | A hard coded credential and a signed cookie | There is no `auth.users` identity. Mitigated by the server side session checks in the proxy and in every server action. The swap point is `src/lib/auth.ts` alone |
| 7, 8 | RLS restricts access to authorised administrators | RLS is a deny all backstop for anon and authenticated, while the postgres role bypasses RLS, so the session cookie is the real gate | Documented in section 6.4, with the hardening path |
| 8 | "Never expose the Supabase service-role key in browser code" | The service role key is not used at all | Stricter than the plan |
| 6 | A recipient's payout must not be assumed to equal their personal contribution | The seeded values happen to equal each recipient's contribution, but the application never derives payouts. They are stored and edited | Complies with the intent: no automatic derivation and no equal split assumption |
| 13 | Do not mark members paid from combined group totals | Unchanged | Status is computed per member from the obligation and that member's valid payments |

### 15.3 What was verified, and how

| Claim | How |
|---|---|
| The 17 contributions total Rs 1,00,000 | `db:verify` against the live database, and the same check in the integration tests |
| The seed is idempotent | The seed was run twice with no row count change, asserted again in the tests |
| No payment history is fabricated | The seed creates no payment row, asserted by the test that re-runs the seed and compares the payment count before and after |
| The publishable key cannot reach the data | GET, POST and DELETE on all eight tables return 401. Checked by `db:check` and by the integration tests |
| The audit trail cannot be rewritten | The integration tests assert that UPDATE and DELETE are both rejected |
| Reversed payments leave the totals | Integration test: after a reversal the collected total is zero and both entries remain in the ledger |
| A duplicate submission is not recorded twice | Integration test: the same key twice produces one row and returns the original payment id |
| The route protection works | The end to end script replays the real login form: unauthenticated gives 307, a wrong password gives no cookie, the correct password gives a cookie, then every screen renders |
| The screens work on a phone | 54 layout checks in real Chrome at 390, 768 and 1280 pixels, checking for horizontal overflow, missing content and console errors |
| The tests do not touch the real data | Every integration test runs inside a rolled back transaction, and the row counts and the audit trail were checked afterwards |
| The schema and the code agree | `prisma db pull` shows no drift |

---

## 16. Outstanding work

1. **Rotate `ADMIN_PASSWORD` before the application is deployed publicly.** The
   current value is short and has been shared in a chat transcript.
2. **Rotate the Supabase database password.** It was also shared. Update
   `DATABASE_URL` and `DIRECT_URL` in `.env.local` and in the Vercel
   environment variables.
3. **Set up the backups** once the deployment is live.
4. **Review the seeded payout plan** on the Timeline screen and adjust the
   planned amounts to match the actual arrangement before the first
   disbursement.
5. **Consider Vercel deployment protection.** The application has one static
   password, so a second locked door is worthwhile.
6. **The repository folder is still named `Cheeti-Manager`.** The application,
   the package and this document all use Yasir Ledger. The folder could not be
   renamed while the editor held it open.
7. **Nothing has been deployed yet.** The application runs locally against the
   live Supabase project.

---

Yasir Ledger · Cheeti contribution scheme · Managed by Yasir
