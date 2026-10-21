# Backup and restore

The Supabase database is the only system of record. Everything the application
knows lives in these eight tables:

`members` · `monthly_rounds` · `contribution_obligations` · `payments` ·
`payouts` · `share_groups` · `share_group_members` · `audit_logs`

---

## 1. Two kinds of backup

| Kind | What it is | How to restore |
|---|---|---|
| **Supabase's own** | Platform-managed daily snapshots, available in the dashboard under *Settings → Database → Backups* | Restore the whole database from the dashboard |
| **Application backup** | A JSON file produced by `npm run db:backup`, containing every row of every table | `npm run db:restore -- <file>` |

Use both. The platform backup protects the whole database, including anything
outside the application. The application backup is portable, readable, and can
be restored into a different project.

---

## 2. Taking a backup

```bash
npm run db:backup
```

The file is written to `backups/yasir-ledger-<timestamp>.json` and the number of
rows in each table is printed:

```
Backup written to .../backups/yasir-ledger-2026-10-21T07-35-14-149Z.json

  members                      17 row(s)
  monthly_rounds               10 row(s)
  contribution_obligations     170 row(s)
  payments                      0 row(s)
  payouts                      19 row(s)
  ...
```

To choose the filename:

```bash
npm run db:backup -- backups/before-the-july-round.json
```

> **Backups contain personal information** — member names, phone numbers and
> payment history. The `backups/` directory is gitignored and must never be
> committed. Keep the files somewhere private, and delete the ones you no
> longer need.

---

## 3. Restoring

```bash
npm run db:restore -- backups/yasir-ledger-2026-10-21T07-35-14-149Z.json
```

- The whole restore runs inside **one transaction**. If anything fails, the
  database is left exactly as it was.
- Each table is emptied and repopulated from the file, in dependency order.
- `audit_logs` is treated differently: the existing rows are **never** deleted
  or modified, because the audit trail is append-only. Missing rows are added
  back so that the history is complete, but the trail can never be rewritten.

Restoring **replaces** the current data. Take a fresh backup first if you are
unsure.

---

## 4. A schedule that works

The scheme runs for ten rounds, and most of the interesting data arrives as
payments are recorded. A practical routine:

- **Every round end** (end of each month from October 2026 to July 2027):
  run `npm run db:backup` and copy the file to a private location.
- **Before any risky change** — editing a member's default contribution in
  bulk, restructuring obligations, or applying a new migration — take a backup
  first.
- **Once the scheme is finished** (after July 2027): take a final backup and
  keep it permanently. The data is the record of who paid what.

On Windows, a scheduled task can run the backup command daily:

```bat
schtasks /create /tn "Yasir Ledger backup" /sc daily /st 22:00 ^
  /tr "cd /d C:\path\to\yasir-ledger && npm run db:backup"
```

---

## 5. Restoring into a different Supabase project

1. Create a new project on Supabase.
2. Copy `DATABASE_URL` and `DIRECT_URL` from the new project into `.env.local`.
3. Apply the schema:

   ```bash
   npm run db:migrate
   ```

4. Restore the data:

   ```bash
   npm run db:restore -- backups/yasir-ledger-<timestamp>.json
   ```

5. Check the result:

   ```bash
   npm run db:verify
   ```

---

## 6. Checking a backup without restoring it

The backup is plain JSON and can be inspected directly:

```bash
node -e "const b=require('./backups/yasir-ledger-2026-10-21T07-35-14-149Z.json'); console.log('members:', b.tables.members.length, 'payments:', b.tables.payments.length); console.log('total collected:', b.tables.payments.filter(p=>!p.reversal_of_payment_id).reduce((s,p)=>s+Number(p.amount),0),'paise')"
```

---

## 7. Recovering from a mistake in the application

Most mistakes do not need a restore:

| Mistake | How to undo it |
|---|---|
| A payment was recorded in error | **Transactions → the row → Reverse.** The original stays in the ledger and is excluded from the totals. |
| The wrong amount was entered | Reverse it, then record the correct payment. Both entries stay visible. |
| A member's name or phone number is wrong | **Members → edit.** Nothing else is affected. |
| A member's default contribution is wrong | **Members → edit.** Past obligations and payments are deliberately unchanged, so nothing else is affected. |
| An obligation is wrong for one month | **Collections → the member → edit the obligation.** |
| A recipient is wrong for a month | **Timeline → the month → remove or add the recipient.** |

A restore is only needed if the database itself is damaged.

---

## 8. What a backup does not cover

- The environment variables (`ADMIN_PASSWORD`, `SESSION_SECRET`, the database
  password). Keep a copy of `.env.local` somewhere private and secure, and
  never commit it.
- The Vercel deployment. The code lives in git, so a redeploy restores it.
- The Supabase project settings, which live in the Supabase dashboard.
