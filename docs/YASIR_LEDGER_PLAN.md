# Yasir Ledger
## Product Requirements and Implementation Plan

**Project owner:** Yasir  
**Application:** Yasir Ledger — cheeti contribution scheme manager  
**Scheme period:** October 2026 – July 2027  
**Currency:** Indian Rupee (INR)  
**Timezone:** Asia/Kolkata  
**Document version:** v2 — updated during implementation setup  
**Last updated:** 2026-10-21  

> **v2 changelog.** Sections 2, 4, 5, 6, 7, 8, 21, 22 and 23 have been revised to
> reflect the decisions confirmed by the project owner during setup. Section 25
> ("Decisions, Deviations and Required Configuration") is new and records every
> confirmed decision, every deliberate deviation from this plan, and the exact
> configuration the owner must supply. Read Section 25 alongside the rest of this
> document — it is the authoritative record of what was actually agreed.

### Implementation status

| Phase | Scope | State |
|---|---|---|
| 1 | Project setup, auth foundation, data layer | Complete |
| 2 | Database, RLS, seed, ₹1,00,000 gate | Complete — gate passed |
| 3 | Financial engine, payment recording, reversals | Complete — 100 tests passing |
| 4 | The six screens, connected to live records | Complete |
| 5 | Search, filters, reminders, contact links, CSV export, PWA | Complete |
| 6 | Lint, types, tests, build, documentation | Complete |

Verification run at the end of the build: `eslint` 0 problems, `tsc --noEmit`
clean, 100 tests passing, `next build` succeeding, the end-to-end HTTP check
passing, 54 responsive layout checks passing in a real browser, and the seeded
scheme verified against the live database.

---

## 1. Project Overview

Build a production-ready, mobile-first web application to manage a monthly cheeti contribution scheme.

The application will help the administrator track:

- Who has paid and who has not paid.
- How much each person is expected to contribute.
- Full and partial payments.
- Monthly collection totals and outstanding balances.
- People who need payment reminders.
- Monthly payout recipients and payout status.
- Complete payment history and financial reconciliation.

The application must use a real Supabase database. Do not build a static dashboard with hardcoded financial data.

The primary user is the administrator, Yasir, who manages the collections and records payments received from the group.

### Main objective

Make payment tracking quick enough to complete from a mobile phone in a few seconds, without manually calculating totals or repeatedly revisiting bank records.

## 2. Technology Stack

Use the following stack (v2 — confirmed during setup):

- **Framework:** Next.js 16 App Router (`src/` directory, React Server Components)
- **Language:** TypeScript 5.9 with strict type checking
- **Styling:** Tailwind CSS v4
- **UI components:** shadcn/ui
- **Icons:** Lucide React
- **Database:** Supabase PostgreSQL (hosted free-tier project, region `ap-southeast-1`)
- **ORM / data access:** Prisma 7.10.1 with the `@prisma/adapter-pg` driver adapter
  (pure-JavaScript `pg` driver — no native engine binary, no Docker, no psql, no Python)
- **Authentication:** single hard-coded administrator credential held in server-only
  environment variables, exchanged for an HMAC-signed session cookie
  (see Section 8 and Section 25 for the deviation from the original Supabase Auth decision)
- **Database security:** Supabase Row Level Security (RLS) enabled on every financial table,
  with **no policies granted to `anon`/`authenticated`** so that direct PostgREST access
  using the project's publishable key returns nothing
- **Validation:** Zod v4
- **Forms:** React Hook Form
- **Data fetching:** TanStack Query where useful; direct Prisma queries in Server Components otherwise
- **Charts:** Recharts, only where they add value
- **Hosting:** Vercel
- **Mobile experience:** Responsive PWA
- **Testing:** Vitest 5 (unit tests) plus integration tests executed against the live
  database inside a rolled-back transaction

Do not introduce Redux, a separate Express server, microservices, or unnecessary dependencies.

**Do not use Docker, Python, `psql`, or the Supabase CLI.** All database work runs through
Node.js: the `pg` driver for SQL execution and Prisma for typed queries.

First inspect the existing repository. Preserve useful configuration, conventions and existing code wherever possible.

## 3. Application Branding and Publicity

The application should have a clean, trustworthy financial dashboard design.

> **v2 — renamed.** The product is called **Yasir Ledger**. The word *cheeti* is retained as
> the description of the scheme the application manages, so the product reads as a
> professional financial tool while remaining unambiguous about what it is for.

Include a subtle owner/organizer credit using the following text:

**"Managed by Yasir"**

### Placement

- Dashboard footer: `Yasir Ledger · Cheeti contribution scheme · Managed by Yasir`
- Login page footer: `Organized and managed by Yasir`
- Optional About section: `Yasir Ledger is a private contribution-tracking application for a cheeti scheme, managed by Yasir.`

Keep the branding understated. Do not place the credit inside every member row, payment record, receipt or financial transaction.

Do not use the branding to imply government approval, bank affiliation, financial certification or regulatory endorsement.

Keep the owner name configurable so it can be changed later without modifying multiple components.

Suggested configuration:

- Application name: Yasir Ledger
- Application description: Cheeti contribution scheme manager
- Scheme name: Cheeti
- Owner display name: Yasir
- Owner credit: Managed by Yasir
- Currency: INR
- Locale: en-IN
- Timezone: Asia/Kolkata
- Package / repository name: `yasir-ledger`

The credit should not expose private information or personal contact details.

### 3.1 Splash screen (v2)

The application opens on a branded splash screen while the session is verified and the first
screen loads.

- A monogram logo: the letter **Y**, rendered as text in a rounded square with a subtle
  gradient and shadow — no image asset is required, so it renders instantly and scales
  cleanly on every device.
- Below the logo: the product name **Yasir Ledger**, and beneath it the description
  **Cheeti contribution scheme manager**.
- A slim indeterminate loader bar beneath the text.
- The splash is shown once per app load, then fades out. It is never shown on every route
  change, and it must never block input or trap the user if it fails to dismiss.
- The same splash component is used as the loading state of the authenticated shell and of
  the login page, so the experience is consistent.
- Respect `prefers-reduced-motion`: the logo and text appear immediately and the loader bar
  becomes static.

## 4. Scheme Configuration

The scheme runs for ten monthly rounds:

October 2026 through July 2027.

- Monthly collection target: ₹1,00,000
- Number of members: 17
- Number of rounds: 10
- Initial administrator: Yasir

The supplied contribution amounts total exactly ₹1,00,000.

Important: A person's default contribution amount must be distinct from the amount they have actually paid.

The application must never mark someone as paid simply because the month has started or because the total collection is sufficient.

### 4.1 Money representation (v2)

All monetary columns are stored as **integer paise** in a `BIGINT` column — never as
floating point and never as a decimal string. ₹1,00,000 is stored as `10000000`.

- No rounding error is possible; every amount is an exact integer number of paise.
- All supplied contribution amounts are exact multiples of ₹500, so no rounding rule is ever needed.
- Amounts are converted from rupees to paise once, at the input boundary.
- The Prisma client exposes these columns as `BigInt`; the application converts them to
  JavaScript `number` at the data-transfer boundary. The maximum representable value
  (₹21,47,48,364.75) is far beyond the scheme's lifetime totals, so the conversion is safe.
- Formatting is always performed with `Intl.NumberFormat` using locale `en-IN` and currency `INR`.

### 4.2 Contribution obligation policy (v2)

Every member has a contribution obligation in every round, seeded from that member's
default contribution amount. This is the only configuration under which each round's
obligations sum to exactly ₹1,00,000.

- Editing a member's default contribution does **not** alter existing obligations.
- An obligation can be marked `is_applicable = false` for a round, which produces the
  "Not Applicable" status for that member in that round.
- A round's expected collection is always the sum of its applicable obligations, never
  a hardcoded ₹1,00,000, and never the sum of what happens to have been paid.

## 5. Initial Member Data

Create the following 17 member records.

| Member | Default Monthly Contribution |
|---|---:|
| Yasir | ₹10,000 |
| Ibrahim | ₹10,000 |
| Rahima | ₹10,000 |
| Fatima | ₹5,000 |
| Rahila | ₹5,000 |
| Hidayat | ₹8,000 |
| Sajidh | ₹2,000 |
| Zeenata Badeami | ₹12,500 |
| Arshad Badeami | ₹5,000 |
| Khaise | ₹2,500 |
| Zaakir Aapa | ₹2,500 |
| Afsar | ₹2,500 |
| Farhat | ₹5,000 |
| Shakir | ₹10,000 |
| Zeenat Aunty | ₹2,500 |
| Sumayya | ₹2,500 |
| Munni Aunty | ₹5,000 |
| **Total** | **₹1,00,000** |

### Data initialization rules

- Use a repeatable, idempotent seed script.
- Do not create duplicate members if the seed script runs again.
- Use stable UUIDs or stable lookup keys.
- Allow names and default contribution amounts to be edited.
- Phone numbers are optional.
- Start payment history empty unless the administrator imports confirmed historical transactions.
- Never fabricate historical payments.

### 5.1 Seeding implementation (v2)

- **Stable lookup key:** each member carries a `slug` column (unique, immutable) used as the
  upsert key, e.g. `yasir`, `ibrahim`, `zeenata-badeami`. UUIDs are generated by the database
  default and are never hardcoded in the seed.
- **Upsert semantics:** the seed uses `INSERT ... ON CONFLICT (slug) DO UPDATE` for members,
  `ON CONFLICT (year, month)` for rounds, `ON CONFLICT (round_id, member_id)` for obligations
  and `ON CONFLICT (round_id, recipient_member_id)` for payouts.
- **Re-running the seed must change nothing** — it must not duplicate rows, and it must not
  overwrite administrator edits made after the first run (seed only creates missing rows and
  fills in columns that were never set).
- **Payments are never seeded.** The `payments` table starts empty, so the application contains
  no fabricated financial history.
- **Verification script:** `scripts/verify-seed.mjs` asserts the seeded state against the
  database and fails loudly if any invariant is violated:
  1. exactly 17 members, all slugs unique;
  2. the sum of all `default_contribution_amount` values is exactly `10000000` paise (₹1,00,000);
  3. exactly 10 rounds, one per month from October 2026 to July 2027;
  4. every round's `collection_target` is `10000000` paise;
  5. exactly 170 obligations (17 members × 10 rounds), one per member per round;
  6. the sum of applicable obligations in **each** round is exactly `10000000` paise;
  7. exactly 19 payout rows matching the Section 6 schedule;
  8. zero payment rows.
- This verification is a **release gate**: the payment engine (Section 12) is not implemented
  until every assertion above passes.

## 6. Monthly Payout Schedule

Create the following initial monthly rounds and recipient assignments.

| Month | Recipient or Recipients |
|---|---|
| October 2026 | Yasir |
| November 2026 | Ibrahim |
| December 2026 | Fatima, Rahila |
| January 2027 | Hidayat, Sajidh |
| February 2027 | Zeenata Badeami |
| March 2027 | Arshad, Khaise, Zaakir Aapa |
| April 2027 | Zeenata Badeami, Afsar, Farhat |
| May 2027 | Rahima, Rahila |
| June 2027 | Shakir |
| July 2027 | Zeenat Aunty, Sumayya, Munni Aunty |

### Schedule requirements

- Support multiple recipients in one month.
- Allow recipients and payout amounts to be edited.
- Store payout amounts independently from contribution amounts.
- Track planned payout amounts separately from actual disbursements.
- Allow historical October payments to be entered with their actual dates.
- Do not assume that every member contributes to every round unless an obligation is configured.
- Do not assume that a recipient's payout is equal to their personal contribution.

**Confirmed (v2):** the schedule's `Apsar` refers to the member named **`Afsar`** — it was a
typo in the source schedule, not a separate person. April 2027 is seeded with
`Zeenata Badeami, Afsar, Farhat`. In the table above, `Arshad` refers to the member
`Arshad Badeami`.

### 6.1 Initial planned payout amounts (v2)

Each seeded payout row starts with `planned_amount` equal to **that recipient's own default
contribution amount**, in paise:

| Month | Recipient(s) | Planned payout amount(s) | Round total |
|---|---|---|---:|
| October 2026 | Yasir | 10,00,000 | 10,00,000 |
| November 2026 | Ibrahim | 10,00,000 | 10,00,000 |
| December 2026 | Fatima, Rahila | 5,00,000 + 5,00,000 | 10,00,000 |
| January 2027 | Hidayat, Sajidh | 8,00,000 + 2,00,000 | 10,00,000 |
| February 2027 | Zeenata Badeami | 12,50,000 | 12,50,000 |
| March 2027 | Arshad Badeami, Khaise, Zaakir Aapa | 5,00,000 + 2,500 + 2,500 | 10,00,000 |
| April 2027 | Zeenata Badeami, Afsar, Farhat | 12,50,000 + 2,500 + 5,00,000 | 20,00,000 |
| May 2027 | Rahima, Rahila | 10,00,000 + 5,00,000 | 15,00,000 |
| June 2027 | Shakir | 10,00,000 | 10,00,000 |
| July 2027 | Zeenat Aunty, Sumayya, Munni Aunty | 2,500 + 2,500 + 5,00,000 | 10,00,000 |

(Amounts shown in paise for exactness; ₹1,00,000 = 10,00,000 paise.)

These are **starting values only**. The application never derives a payout amount
automatically — `planned_amount` is stored, edited on the Timeline screen, and is fully
independent of `actual_amount`. A round's total planned payout is therefore not expected to
equal that round's collection target, and no reconciliation warning is raised merely
because they differ; reconciliation warnings are raised only for the conditions listed in
Section 10.

## 7. Database Architecture

Create the following normalized PostgreSQL tables.

### 7.1 `members`

Fields:

- `id`
- `full_name`
- `phone_number`, nullable
- `default_contribution_amount`
- `is_active`
- `notes`, nullable
- `created_at`
- `updated_at`

### 7.2 `monthly_rounds`

Fields:

- `id`
- `year`
- `month`
- `round_name`
- `collection_target`
- `status`
- `notes`, nullable
- `created_at`
- `updated_at`

Enforce uniqueness for the year and month combination.

### 7.3 `contribution_obligations`

Fields:

- `id`
- `round_id`
- `member_id`
- `expected_amount`
- `is_applicable`
- `notes`, nullable
- `created_at`
- `updated_at`

Enforce one obligation per member per round.

Historical obligations must remain unchanged when future contribution defaults are edited.

### 7.4 `payments`

Fields:

- `id`
- `round_id`
- `member_id`
- `amount`
- `payment_method`
- `received_at`
- `transaction_reference`, nullable
- `note`, nullable
- `idempotency_key`
- `created_by`
- `reversal_of_payment_id`, nullable
- `created_at`

Requirements:

- Support multiple payments per member per month.
- Support partial payments.
- Preserve transaction history.
- Prevent duplicate submissions.
- Support corrections and reversals.
- Exclude reversed transactions from valid collection totals.
- Record who entered each payment.

### 7.5 `payouts`

Fields:

- `id`
- `round_id`
- `recipient_member_id`
- `planned_amount`
- `actual_amount`, nullable until confirmed
- `status`
- `paid_at`, nullable
- `transaction_reference`, nullable
- `note`, nullable
- `created_at`
- `updated_at`

Support multiple recipients per monthly round.

### 7.6 `share_groups`

Fields:

- `id`
- `name`
- `target_share_amount`
- `is_active`
- `created_at`
- `updated_at`

### 7.7 `share_group_members`

Fields:

- `id`
- `share_group_id`
- `member_id`
- `allocated_amount`
- `effective_from_round_id`, nullable
- `effective_until_round_id`, nullable

These tables represent people who combine their contributions to form a larger share, such as ₹5,000 + ₹5,000 or ₹8,000 + ₹2,000.

Group membership must not replace individual contribution obligations or payment transactions.

### 7.8 `audit_logs`

Fields:

- `id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `before_data`, where appropriate
- `after_data`, where appropriate
- `created_at`

Record important changes, especially payment reversals, contribution changes and payout changes.

### Database implementation rules

- Use UUID primary keys.
- Add foreign keys and appropriate indexes.
- Add database constraints for valid amounts and unique relationships.
- Use integer paise or another exact representation for financial calculations.
- Keep financial calculations on trusted server-side logic or in reliable database queries.
- Create version-controlled SQL migrations.
- Keep seed scripts repeatable.
- Do not store derived collection totals as independently editable values.

### 7.9 Column-level implementation notes (v2)

- **Money columns:** every monetary column is `BIGINT` holding paise, with a `CHECK` constraint
  preventing negative values (`payments.amount` additionally requires `> 0`).
- **`members.slug`:** added as a `TEXT UNIQUE` column. It is the stable lookup key for seeding
  and is immutable after creation. The plan's `full_name` and all other columns are unchanged.
- **`payments.idempotency_key`:** `TEXT NOT NULL UNIQUE`. This is the database-level guarantee
  behind "prevent duplicate submissions" — a retried insert fails on the unique index rather
  than creating a second transaction, and the server returns the already-stored payment.
- **`payments.reversal_of_payment_id`:** self-referencing foreign key with a `CHECK` constraint
  preventing self-reference.
- **`monthly_rounds` uniqueness:** enforced by `UNIQUE (year, month)` and a `CHECK (month BETWEEN 1 AND 12)`.
- **`contribution_obligations` uniqueness:** enforced by `UNIQUE (round_id, member_id)`.
- **`payouts` uniqueness:** enforced by `UNIQUE (round_id, recipient_member_id)`.
- **`created_by` / `actor_id`:** because there is exactly one administrator (Section 8), these
  columns store a single fixed actor identifier,
  `00000000-0000-4000-8000-000000000001`, rather than a reference into `auth.users`. The audit
  trail still records *who* acted, and the column remains a UUID for future multi-user use.
- **`updated_at`:** maintained by a `BEFORE UPDATE` trigger on `members`, `monthly_rounds`,
  `contribution_obligations`, `payouts`, `share_groups` and `share_group_members`.
- **Indexes:** on every foreign key (`payments.round_id`, `payments.member_id`,
  `contribution_obligations.member_id`, `payouts.recipient_member_id`,
  `share_group_members.member_id`), on `payments.received_at`, and on
  `payments (round_id, member_id)` for the per-member collection screen.

### 7.10 Migration mechanism (v2)

- **Source of truth for schema:** hand-authored, version-controlled SQL files in
  `supabase/migrations/`, named `<timestamp>_<description>.sql`, applied in filename order.
- **Application:** `scripts/migrate.mjs`, using the pure-JavaScript `pg` driver. It applies
  each file inside a transaction and records it in a `schema_migrations` ledger table
  (`version` primary key, `name`, `checksum`, `applied_at`). A file whose checksum has changed
  is reported as an error rather than silently re-applied.
- Prisma's own `migrate dev` is **not** used, because it requires a shadow database that the
  Supabase free tier does not permit creating.
- **Prisma's role:** `prisma/schema.prisma` mirrors the migrated schema and is used to generate
  the typed query client (`prisma generate` → `src/generated/prisma/client`). It is the query
  layer, not the migration layer.
- `npx prisma db pull` is used as a drift check: if the schema and the database ever disagree,
  the difference is detected in CI rather than at runtime.

### 7.11 Row Level Security implementation (v2)

- RLS is enabled on **every** table in `public`, including all nine financial tables.
- **No policy is created for `anon` or `authenticated`.** With RLS enabled and no matching
  policy, those roles see zero rows and can perform no inserts, updates or deletes. This is
  deliberate: the project's publishable key is public by nature, and this guarantees that
  direct PostgREST access with it cannot read or modify financial data.
- The application connects as the `postgres` role, which holds `BYPASSRLS`, so Prisma queries
  are not filtered by RLS. **The effective administrator check is therefore the session cookie
  enforced in `src/proxy.ts` and in every server action** — see Sections 8 and 25.
- `audit_logs` additionally has no `UPDATE` or `DELETE` policy for any role, so the audit trail
  is append-only even for the application role.
- `revoke` is applied to sensitive functions from `anon`/`authenticated`.

## 8. Authentication and Security

Implement a secure administrator login using Supabase Auth.

> **v2 — this section has been revised.** The project owner confirmed that the application is
> for a single administrator only and asked for a hard-coded credential with no signup flow,
> no user management and no Supabase Auth dependency. The requirement "protect all
> application routes" and the requirement "restrict access to authorized administrators" are
> **retained in full** and are met by the mechanism below. The deviation is recorded in
> Section 25 and the security rationale is documented in `SECURITY.md`.

### 8.1 Administrator authentication (v2)

- The administrator credential is held in **server-only environment variables**:
  `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Neither uses a `NEXT_PUBLIC_` prefix, so neither is
  ever included in the browser bundle. The values are never committed to git — `.env.local`
  is gitignored and `.env.example` contains names and placeholders only.
- The login form compares the submitted values against the configured values using
  `crypto.timingSafeEqual` over fixed-length buffers, so comparison time does not leak
  information about the stored value.
- On success, the server issues a **signed session cookie**:
  - payload = `base64url(JSON { email, issuedAt, expiresAt })`
  - signature = `base64url(HMAC-SHA256(payload, SESSION_SECRET))`, minimum 256-bit secret
  - cookie attributes: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production,
    7-day lifetime with sliding renewal
- The signature is verified with `crypto.timingSafeEqual` on every request. Any tampering
  with the payload invalidates the cookie.
- A small in-process rate limiter throttles repeated failed logins per client address
  (5 attempts per 15 minutes) to make online guessing impractical.
- A logout action clears the cookie and invalidates the session.
- The credential check lives in exactly one module (`src/lib/auth.ts`) so that switching to
  Supabase Auth later is a single-module change.

### 8.2 Authorization (v2)

- **Every** route except `/login` and the static assets requires a valid session. The check
  runs in `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`), which redirects
  unauthenticated requests to `/login`.
- Route protection alone is not trusted as the security boundary: **every server action
  re-verifies the session** before performing any mutation. A request that bypasses the proxy
  still cannot write to the database.
- All data access happens on the server through Prisma. No database credentials, publishable
  key or session secret is ever exposed to the browser.
- The application's own client-side data fetching uses only the authenticated server
  (React Server Components and server actions), so there is no unauthenticated data channel.

### 8.3 Database security (v2)

- RLS is enabled on every private financial table, with **no policies for
  `anon`/`authenticated`** — so the project's publishable key grants no access through
  PostgREST (Section 7.11).
- The connection uses the `postgres` role over the Supabase **transaction-mode pooler**
  (port 6543) at runtime and the **session-mode pooler** (port 5432) for migrations.
- `audit_logs` is append-only: no `UPDATE` or `DELETE` policy exists for any role.

### 8.4 Remaining requirements (unchanged)

- Protect all application routes.
- Require authorization for all server actions and database mutations.
- Enable RLS on every private financial table.
- Restrict access to authorized administrators.
- Never expose the Supabase service-role key in browser code.
- Keep secrets in environment variables.
- Include `.env.example` with variable names only.
- Validate input on both client and server.
- Prevent unauthorized direct API access.
- Protect against duplicate payment submissions.
- Keep audit logs protected from ordinary modification.
- Provide backup and restore documentation.

The first release needs only the administrator workflow. Do not build a complicated multi-role system unless a genuine requirement emerges.

## 9. Application Navigation

Create these primary sections:

1. Dashboard
2. Collections
3. Members
4. Timeline
5. Transactions
6. Settings

Desktop should use a sidebar.

Mobile should use a compact bottom navigation bar.

The current month should be easy to see and change.

## 10. Dashboard

The dashboard must display:

- Selected monthly round.
- Expected contribution total.
- Amount collected.
- Outstanding amount.
- Number of fully paid members.
- Number of partially paid members.
- Number of pending members.
- Next scheduled recipient or recipients.
- Planned and actual payout totals.
- Recent payment transactions.
- Members who need reminders.
- Collection and payout reconciliation warnings.

All figures must be derived from actual Supabase data.

Do not hardcode sample totals or mark sample data as real financial activity.

### Dashboard calculations

Expected collection = sum of applicable contribution obligations.

Total collected = sum of valid payment transactions.

Outstanding balance = sum of each member's positive outstanding balance.

Paid members = count of members whose obligations are fulfilled.

Pending members = count of members with outstanding balances.

Collection progress = total collected divided by expected collection, with appropriate handling for zero obligations.

Planned payout = sum of configured payout amounts.

Actual payout = sum of confirmed disbursements.

## 11. Collections Screen

Display all members for the selected monthly round.

Each row must contain:

- Member name.
- Expected contribution.
- Total paid.
- Outstanding balance.
- Payment status.
- Latest payment date.
- Quick record-payment action.
- Expandable payment history.

### Filters

- All members
- Pending
- Partially paid
- Paid
- Overpaid
- Not applicable

### Additional features

- Search members by name.
- Sort pending members to the top.
- Quickly record the full outstanding amount.
- Enter a custom partial-payment amount.
- View previous transactions.
- Open a payment reminder.
- Call or WhatsApp a member if their phone number is available.

On mobile, use compact cards or list rows instead of wide tables.

## 12. Payment Recording Workflow

The workflow should take only a few seconds.

1. Open Collections.
2. Select the monthly round.
3. Search for or select a member.
4. Enter the amount received, or use the full outstanding amount shortcut.
5. Select UPI, bank transfer, cash or other.
6. Enter the actual receipt date and time.
7. Optionally enter a transaction reference or note.
8. Submit the payment.
9. Validate and persist the payment.
10. Refresh the member balance and collection totals.

### Payment form requirements

- Prefill the member and month when opened from a member row.
- Reject zero or negative amounts.
- Show the current outstanding balance.
- Show the resulting balance after payment.
- Disable repeated submission while a request is in progress.
- Implement idempotency on the server.
- Do not report success until the database confirms the write.
- Preserve form data after recoverable network errors.
- Show useful error messages.
- Keep every successful payment as a separate transaction.

A payment should not automatically be treated as bank-verified. The administrator enters the transaction after seeing the bank notification or receiving other confirmation.

## 13. Payment Status Rules

Calculate statuses from the configured obligation and valid payment transactions.

- **Not Paid:** no valid payment has been received and an amount is due.
- **Partially Paid:** some money has been received, but the expected amount has not been fulfilled.
- **Paid:** the expected contribution has been fulfilled exactly.
- **Overpaid:** valid payments exceed the expected contribution.
- **Not Applicable:** no contribution is due from the member for that round.

For example, if Fatima owes ₹5,000 and pays ₹2,500, her status must be Partially Paid, with ₹2,500 remaining.

When she pays the remaining ₹2,500, her status changes to Paid. Both transactions must remain visible.

Do not mark members as paid based on combined group totals alone.

Do not calculate the number of paid members by dividing the total collection by ₹10,000.

## 14. Members Screen

Display:

- Member name.
- Optional phone number.
- Default contribution.
- Active status.
- Monthly obligations.
- Payment history.
- Outstanding balances by round.
- Total valid contributions recorded.

Allow the administrator to edit member details and default contributions.

Changing a default contribution must not silently change historical obligations or payments.

## 15. Timeline Screen

Display all ten rounds from October 2026 through July 2027.

Each monthly card should show:

- Month and year.
- Scheduled recipients.
- Planned payout amounts.
- Total collected.
- Outstanding balance.
- Payout status.
- Link to the monthly collection records.

Allow recipient assignments and planned payout amounts to be edited.

Support multiple recipients in a round without assuming equal payout amounts.

## 16. Transactions Screen

Provide a complete searchable ledger.

Columns or mobile fields:

- Transaction date.
- Member.
- Monthly round.
- Amount.
- Payment method.
- Reference.
- Transaction status.

Filters:

- Month.
- Member.
- Payment method.
- Date range.
- Valid or reversed transaction.

Features:

- View transaction details.
- Export filtered results to CSV.
- Reverse an incorrect transaction with confirmation.
- Preserve the audit trail.
- Refresh related collection totals after corrections.

## 17. Reminders and Contact Actions

Store optional phone numbers for members.

Provide Call and WhatsApp shortcuts.

Generate an editable reminder message containing:

- Member name.
- Monthly round.
- Expected contribution.
- Amount paid.
- Outstanding balance.

Example:

"Hi Khaise, for October 2026, your contribution is ₹2,500. We have not recorded this payment yet. Please let me know when you have paid."

Generate the message using actual database values. Never send messages automatically in the first release.

Do not claim that a member has not paid if their recorded valid payments show otherwise.

## 18. User Interface Requirements

Build a professional, clean financial dashboard.

- Mobile-first responsive design.
- Readable rupee amounts.
- Consistent spacing and typography.
- Accessible color contrast.
- Large touch targets.
- Minimal animations.
- Clear visual hierarchy.
- Useful loading skeletons.
- Empty states.
- Error states.
- Confirmation dialogs.
- Success feedback.
- Responsive member lists.
- Sticky month selector where useful.
- Desktop sidebar and mobile bottom navigation.

Use a consistent design system across every screen.

Avoid unnecessary charts, decorative elements and complex navigation.

Include the subtle "Managed by Yasir" credit in the application footer and login page.

## 19. PWA Requirements

Make the application installable on a mobile home screen where supported.

Include:

- Web app manifest.
- Appropriate application icons.
- Mobile viewport configuration.
- Suitable theme colors.
- A clean standalone experience where supported.

Do not implement offline payment writes in the first release unless reliable synchronization, duplicate prevention and conflict resolution are implemented.

When offline, clearly indicate that a payment was not saved.

## 20. Bank Integration

The first release must not depend on direct bank integration.

Implement fast manual payment recording.

The administrator will record the amount after a bank notification or other confirmation.

Keep the data model suitable for future supported transaction imports, including duplicate detection and reconciliation.

Do not request or store bank passwords, OTPs or UPI PINs.

Do not claim to have verified a bank payment without an actual supported integration.

## 21. Testing

Write unit tests for financial calculations and integration tests for payment operations.

Test at least:

1. Full payment.
2. Partial payment.
3. Multiple payments by the same member.
4. Correct outstanding balance.
5. Overpayment.
6. Duplicate submission prevention.
7. Payment reversal.
8. Multiple recipients in a month.
9. Historical October transactions.
10. Correct monthly totals.
11. Failed network requests.
12. Authentication and RLS.
13. Responsive mobile layouts.
14. Reconciliation calculations.
15. Repeatable seed scripts without duplicate records.

Run linting, TypeScript checks, automated tests and a production build.

Fix failures where possible and report remaining issues honestly.

### 21.1 Test strategy (v2)

- **Unit tests** (Vitest, no database): all pure financial logic in `src/lib/finance/`.
  These cover the majority of the list above because every financial rule lives in a pure
  function that is independent of React, Next.js and the database.
- **Integration tests** (Vitest, against the live database): executed inside an explicit
  transaction that is **always rolled back**, so the administrator's real data is never
  modified by a test run. The runner asserts the rollback by re-counting rows afterwards.
- **Security tests**:
  - RLS — using the project's publishable key against the PostgREST endpoint, assert that
    every financial table returns zero rows and rejects writes;
  - authorization — assert that an unauthenticated request to a protected page is redirected
    to `/login`, and that a server action invoked without a valid session cookie is rejected.
- **Seed verification** — `scripts/verify-seed.mjs` is run as a test, not only as a manual step,
  and additionally asserts that a second seed run changes no row counts.
- **Responsive layout** — verified manually against a narrow (mobile) and a wide viewport,
  and reported with screenshots; there is no browser-automation dependency in this release.

### 21.2 Required test cases (v2 mapping)

| # | Requirement | Where it is tested |
|---|---|---|
| 1 | Full payment | unit + integration |
| 2 | Partial payment | unit + integration |
| 3 | Multiple payments by the same member | unit + integration |
| 4 | Correct outstanding balance | unit |
| 5 | Overpayment | unit + integration |
| 6 | Duplicate submission prevention | integration (unique `idempotency_key`) |
| 7 | Payment reversal | unit + integration |
| 8 | Multiple recipients in a month | unit + integration |
| 9 | Historical October transactions | integration |
| 10 | Correct monthly totals | unit + integration |
| 11 | Failed network requests | unit (server-action error handling) |
| 12 | Authentication and RLS | integration (security tests) |
| 13 | Responsive mobile layouts | manual verification, reported |
| 14 | Reconciliation calculations | unit |
| 15 | Repeatable seed scripts without duplicate records | integration (`scripts/verify-seed.mjs`) |

## 22. Implementation Phases

### Phase 1: Project setup
- Inspect the existing repository.
- Configure Next.js and TypeScript.
- Establish the design system.
- Configure environment variables.
- Connect Supabase.

**v2 detail:** `git init` + `.gitignore`; scaffold Next.js 16.4.2 (App Router, `src/`),
React 19.3.1, TypeScript 5.9 strict, Tailwind v4.3.3, shadcn/ui, ESLint 9; add
`prisma@7.10.1`, `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, `pg`, `zod@4`,
`react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `recharts`, `lucide-react`,
`vitest@5`; write `prisma.config.ts`, `prisma/schema.prisma`, `src/lib/db.ts`,
`src/lib/money.ts`, `src/lib/auth.ts`, `src/proxy.ts`, `src/config/app.ts`; create
`.env.example` and `.env.local`; verify live connectivity with a `SELECT 1` against the
pooler; run `prisma generate`; add a Vitest smoke test. **Commit 1.**

### Phase 2: Database and security
- Create SQL migrations.
- Create database tables and constraints.
- Configure authentication and RLS.
- Seed the 17 members and ten monthly rounds.
- Verify the initial total of ₹1,00,000.

**v2 detail:** write `supabase/migrations/0001_schema.sql` (nine tables, constraints,
indexes, triggers) and `supabase/migrations/0002_rls.sql` (RLS, grants, revokes); write
`scripts/migrate.mjs` (ledger-tracked, transactional), `scripts/seed.mjs`,
`supabase/seed.sql` and `scripts/verify-seed.mjs`; apply migrations and seed to the live
database; run the verification gate (17 members, ₹1,00,000 total, 10 rounds, 170 obligations,
each round summing to ₹1,00,000, 19 payouts, 0 payments, and a second seed run changing
nothing); confirm the publishable key is denied by RLS. **The payment engine is not started
until this gate passes.** **Commit 2.**

### Phase 3: Financial logic
- Implement contribution obligations.
- Implement payment recording.
- Implement partial payments.
- Implement outstanding balances.
- Implement reversals and audit logging.
- Add financial calculation tests.

**v2 detail:** `src/lib/finance/` holds pure functions (payment status, outstanding,
per-round and per-member aggregates, dashboard totals, reconciliation checks, reminder text,
CSV serialisation) with exhaustive unit tests; `src/app/actions/` holds zod-validated,
session-checked server actions for recording, reversing, editing members, editing
obligations and editing payouts; `idempotency_key` is enforced by a unique index; reversals
write a compensating row plus an `audit_logs` entry and are excluded from valid totals;
integration tests run inside a rolled-back transaction. **Commit 3.**

### Phase 4: Main UI
- Build the dashboard.
- Build Collections.
- Build Members.
- Build Timeline.
- Build Transactions.
- Connect every screen to real database records.

**v2 detail:** app shell with a desktop sidebar and a mobile bottom navigation bar, a sticky
round selector, and the `Managed by Yasir` credit in the footer; Dashboard, Collections,
Members, Timeline, Transactions and Settings screens, each reading live Prisma data; every
figure derived from the database, with loading skeletons, empty states and error states.
**Commit 4.**

### Phase 5: Productivity features
- Add search and filters.
- Add reminder messages.
- Add contact shortcuts.
- Add CSV export.
- Add PWA support.

**v2 detail:** member search and the six status filters with pending-first sorting; the
one-tap "record full outstanding" shortcut; reminder message composer with editable text
built from live values; Call and WhatsApp links when a phone number exists; CSV export of
the filtered transaction ledger; web app manifest, icons, theme colours and viewport
configuration, with an explicit "not saved" state when the device is offline. **Commit 5.**

### Phase 6: Production readiness
- Test mobile and desktop layouts.
- Test RLS and authorization.
- Test failure handling.
- Verify financial totals.
- Document backups.
- Deploy to Vercel.
- Provide setup and deployment documentation.

**v2 detail:** run `lint`, `tsc --noEmit`, `vitest` and `next build`; verify mobile and
desktop layouts by hand and report the result honestly; run the RLS and authorization test
suite; confirm the financial totals against the live database; write `README.md`,
`SECURITY.md`, `BACKUP.md`, `VERCEL.md` and `USER_GUIDE.md`; deploy to Vercel once the
owner has set the environment variables there. **Commit 6.**

## 23. Required Deliverables

Deliver:

- Complete source code.
- SQL migrations.
- Repeatable seed script.
- `.env.example`.
- README.
- Supabase setup instructions.
- Security and RLS documentation.
- Test suite.
- Vercel deployment guide.
- User guide for recording payments and reconciling collections.

### 23.1 Concrete file layout (v2)

```
docs/CHEETI_MANAGER_PLAN.md      this document
prisma/schema.prisma              data model (typed query client source)
prisma.config.ts                  Prisma CLI config (loads .env.local)
supabase/migrations/*.sql         version-controlled SQL migrations
supabase/seed.sql                 idempotent seed (runnable from the SQL editor)
scripts/migrate.mjs               applies migrations via pg, ledger-tracked
scripts/seed.mjs                  idempotent seed runner
scripts/verify-seed.mjs           the Rs 1,00,000 gate
scripts/db-check.mjs              connectivity + RLS probe
src/config/app.ts                 app name, owner branding, currency, locale, timezone
src/lib/db.ts                     Prisma singleton
src/lib/auth.ts                   credential check + signed session cookie
src/lib/money.ts                  paise <-> rupees, en-IN formatting
src/lib/finance/*.ts              pure financial logic (no React, no DB)
src/app/actions/*.ts              server actions (zod validated, session checked)
src/proxy.ts                      session guard / route protection
src/app/**/page.tsx               screens
```

## 24. Final Instructions to the Coding Agent

Inspect the repository before changing files.

Implement the application in manageable phases. Do not stop after writing a plan or creating placeholder pages.

Use reusable components and keep financial business logic separate from presentation code.

Do not invent credentials, historical payments or test results.

Do not claim a feature is complete until it has been implemented and tested.

If external configuration is missing, implement what can be completed and document exactly what the administrator must configure.

Prioritize financial correctness, data integrity, security and a fast mobile workflow over unnecessary complexity.

## 25. Decisions, Deviations and Required Configuration

This section is the authoritative record of what was agreed during setup. It was written
before any code was produced, and it is updated as the build progresses.

### 25.1 Confirmed decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Supabase is used as the **PostgreSQL host only** | Free-tier project `iclzhfatzdauhktpeivi`, region `ap-southeast-1` |
| D2 | **Prisma 7.10.1** is the data-access layer, with `@prisma/adapter-pg` | Typed queries, version-controlled migrations, pure-JS driver — no Docker, no Python, no `psql`, no native engine binary |
| D3 | `prisma` pinned to `7.10.1`, **not** the `latest` tag | `latest` is an 8.0 release candidate |
| D4 | **No Supabase JS SDK** (`@supabase/supabase-js`, `@supabase/ssr` removed) | Prisma covers all data access; fewer client-side credentials |
| D5 | Single **hard-coded administrator credential** + HMAC-signed session cookie | Project owner's explicit instruction: only one user, no signup, no user management |
| D6 | RLS **enabled on every table with zero policies for `anon`/`authenticated`** | The publishable key is public; this makes direct PostgREST access useless |
| D7 | **Money stored as integer paise** in `BIGINT` | Exact arithmetic; matches the plan's preference |
| D8 | **Every member has an obligation in every round** (170 rows) | Only configuration under which each round sums to exactly ₹1,00,000 |
| D9 | Seeded `planned_amount` = **each recipient's own contribution** | Confirmed by the project owner; all values remain editable |
| D10 | **`Apsar` is the member `Afsar`** | Confirmed by the project owner; it was a typo in the source schedule |
| D11 | Migrations are **hand-authored SQL** applied by a Node script | Prisma `migrate dev` needs a shadow database the free tier cannot create |
| D12 | Git initialised with **one commit per phase** | Traceable history for the migration files |
| D13 | Next.js 16 `src/proxy.ts` replaces `middleware.ts` | Next.js 16 renamed the convention; proxy runs on the Node runtime |
| D14 | Product renamed to **Yasir Ledger**; *cheeti* retained as the scheme description | Professional product name while staying unambiguous about purpose (Section 3) |
| D15 | Branded **splash screen** with a "Y" monogram, product name, description and loader | Requested by the project owner; implemented with text only, no image asset (Section 3.1) |
| D16 | Next.js **Cache Components disabled** (`cacheComponents` removed from `next.config.ts`) | The whole application is authenticated and reads cookies. With Cache Components on, calling `cookies()` outside a `<Suspense>` boundary breaks prerendering, and `export const dynamic` is removed. Classic dynamic rendering is simpler and predictable here. |
| D17 | Migration runner is a **custom Node script**, not the Prisma CLI | `prisma migrate dev` requires a shadow database the Supabase free tier cannot create; `directUrl` was also removed in Prisma 7 (Section 7.10) |

### 25.2 Deliberate deviations from this plan

| Plan section | Planned | Actual | Impact and mitigation |
|---|---|---|---|
| §2, §8 | Supabase Auth | Hard-coded credential + signed cookie | No `auth.users` identity. Mitigated by server-side session checks in the proxy **and** in every server action. Swap-in point for Supabase Auth is `src/lib/auth.ts` alone. |
| §7, §8 | RLS restricts access to authorized administrators | RLS is a deny-all backstop for `anon`/`authenticated`; the `postgres` role bypasses RLS, so the session cookie is the real gate | Documented in `SECURITY.md`, including the hardening path (a dedicated non-`BYPASSRLS` role plus per-transaction `request.jwt.claims`). |
| §8 | "Never expose the Supabase service-role key in browser code" | The service-role key is not used at all | Stricter than the plan. |
| §6 | "Do not assume a recipient's payout equals their personal contribution" | Seeded values happen to equal each recipient's contribution; the application never derives payouts, they are stored and editable | Complies with the intent: no automatic derivation, no equal-split assumption. |
| §13 | "Do not mark members as paid based on combined group totals" | Unchanged | Status is computed per member from obligation vs. valid payments. |

### 25.3 Required configuration

`.env.local` (gitignored, **never committed**):

| Variable | Purpose | Supplied |
|---|---|---|
| `DATABASE_URL` | Runtime connection — transaction-mode pooler, port 6543 | Yes |
| `DIRECT_URL` | Migrations — session-mode pooler, port 5432 | Yes |
| `ADMIN_EMAIL` | Administrator login identity | Yes |
| `ADMIN_PASSWORD` | Administrator login secret | Yes |
| `SESSION_SECRET` | HMAC key for the session cookie, ≥256-bit random | Generated locally |

`.env.example` contains these names with placeholder values only.

On Vercel the same variables must be set in **Project → Settings → Environment Variables**;
they are not read from `.env.local` in production.

### 25.4 Outstanding risks and follow-ups for the owner

1. **Rotate `ADMIN_PASSWORD` before any public deployment.** The current value is weak and was
   shared in a chat transcript.
2. **Add Vercel deployment protection** if the URL should not be publicly reachable — the
   application has one static credential, so a second locked door is worthwhile.
3. **Never commit `.env.local`.** The repository's `.gitignore` covers it; verify before the
   first push.
4. **Backups:** the database is the only system of record. `BACKUP.md` documents the daily
   `pg_dump` schedule and the restore procedure.
5. **The seed's payout plan is a starting point.** Review the Section 6.1 table in the app's
   Timeline screen and edit `planned_amount` before the first disbursement.
6. **The Supabase project password is known outside the deployment.** It has been shared in a
   chat transcript. Rotate it from the Supabase dashboard and update `DATABASE_URL` and
   `DIRECT_URL` in `.env.local` and in the Vercel environment variables.
7. **The physical repository folder is still named `Cheeti-Manager`.** The application, the
   package and the documentation all use *Yasir Ledger*; only the folder on disk keeps the old
   name. It could not be renamed while the editor held it open.

### 25.5 What was verified, and how

| Claim | How it was verified |
|---|---|
| The 17 contributions total ₹1,00,000 | `npm run db:verify` against the live database — 10,000,000 paise, and every round's obligations total the same |
| The seed is idempotent | The seed was run twice; the row counts did not change. Asserted again in the integration tests. |
| No payment history is fabricated | The seed never creates a payment row; this is asserted by the integration test that re-runs the seed and compares the payment count before and after. |
| The publishable key cannot reach the data | `GET`, `POST` and `DELETE` on all eight tables return 401. Checked by `npm run db:check` and by the integration tests. |
| The audit trail cannot be rewritten | The integration tests assert that `UPDATE` and `DELETE` on `audit_logs` are both rejected. |
| Reversed payments leave the totals | Integration test: after a reversal the collected total is 0 and both entries remain in the ledger. |
| A duplicate submission is not recorded twice | Integration test: the same idempotency key twice produces one row and returns the original payment id. |
| The route protection works | The end-to-end check replays the real login form: unauthenticated → 307, wrong password → no cookie, correct password → cookie, then every screen renders. |
| The screens work on a phone | `scripts/visual-check.mjs` drives the installed Chrome through every screen at 390, 768 and 1280 pixels wide, and asserts no horizontal overflow, no missing content and no console errors — 54 checks. It found and fixed three real defects. |
| The tests do not touch the real data | Every integration test runs inside a rolled-back transaction; the row counts and the audit trail were checked afterwards and were unchanged. |
| The schema and the code agree | `prisma db pull` shows no drift between `prisma/schema.prisma` and the migrated tables. |
