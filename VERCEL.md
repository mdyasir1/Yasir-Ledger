# Deploying to Vercel

Yasir Ledger is a Next.js 16 application that talks to Supabase Postgres
through Prisma. It deploys to Vercel without any extra services.

---

## 1. Prerequisites

- A Vercel account.
- The project on GitHub (or any git provider Vercel supports).
- The Supabase project, with the schema applied and the data seeded:

  ```bash
  npm run db:migrate
  npm run db:seed
  npm run db:verify
  ```

---

## 2. Import the project

1. In Vercel, choose **Add New → Project** and import the repository.
2. Framework preset: **Next.js**. The build and start commands are detected
   automatically.
3. Leave the build settings alone. The `postinstall` script runs
   `prisma generate`, so the typed client exists before the build starts.

---

## 3. Environment variables

Set these under **Project → Settings → Environment Variables**. They are
encrypted at rest and are never printed in the build log.

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | The transaction-mode pooler. `connection_limit=1` suits a serverless runtime. |
| `DIRECT_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` | The session-mode pooler, used by the CLI and the migration scripts. |
| `ADMIN_EMAIL` | Your email | The single administrator's identity. |
| `ADMIN_PASSWORD` | A strong password | **Use a new one, not the development password.** |
| `SESSION_SECRET` | 32+ random bytes, hex | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Rotating it signs out every session. |

Optional, only for the RLS check in `npm run db:check`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |

> The publishable key is public by design and safe to expose. The database
> password and `SESSION_SECRET` are not, and must never use a `NEXT_PUBLIC_`
> prefix.

Apply the variables to **Production**, and to **Preview** as well if you want
preview deployments to work.

---

## 4. Deploy

Press **Deploy**. The build runs `npm install` (which generates the Prisma
client), `next build` and then starts the server.

After the first deploy:

1. Open the deployment URL. You should see the splash screen and then the
   login page.
2. Sign in with the administrator credentials.
3. Check that the dashboard shows **₹1,00,000** expected for October 2026.
   If it shows nothing, the environment variables are wrong.

---

## 5. Running the migrations against the hosted database

The schema is **not** applied by the build, on purpose: a build should not be
able to change a production database. Apply migrations explicitly.

Option A — from your machine, against the same project:

```bash
# .env.local already points at the hosted project
npm run db:migrate
npm run db:seed     # only on a brand new project
npm run db:verify
```

Option B — from Vercel, in a one-off command (if the CLI is installed):

```bash
vercel env pull .env.production.local
node scripts/migrate.mjs
```

Use option A for the first deployment. It is the same command that was used to
build the schema, so there is no chance of the two drifting apart.

---

## 6. After deploying

- **Rotate the password.** Set a strong `ADMIN_PASSWORD` in Vercel and redeploy.
  The old value only ever existed in your local `.env.local`.
- **Turn on deployment protection.** *Project → Settings → Deployment
  Protection → Password*. The application has one password; this is a second
  locked door in front of the whole site.
- **Set up the backups.** See [BACKUP.md](./BACKUP.md).
- **Add the domain** (Settings → Domains) if you want a memorable address.
- **Check the health** of the deployment:

  ```bash
  npm run e2e -- https://your-deployment.vercel.app
  ```

  This replays the real login form, checks that a wrong password is rejected,
  and confirms that every protected screen renders the live figures.

---

## 7. Troubleshooting

**"Missing required environment variable: DATABASE_URL"**
The variable is not set for the environment the code is running in. Check that
it is applied to Production, and redeploy — a redeploy is needed for a new
environment variable to take effect.

**The dashboard shows ₹0**
Either the data was not seeded, or the application is connected to a different
database than the one you seeded. Run `npm run db:verify` against the same
`DIRECT_URL` and compare the project reference.

**"current transaction is aborted"**
The connection is going through a pooler that cannot hold an interactive
transaction. Use the session-mode pooler (port 5432) for `DIRECT_URL`.

**"Too many clients"**
The runtime pooler is exhausted. Lower `connection_limit` in `DATABASE_URL`
and make sure the Prisma client is a single instance per serverless function
(the application already caches it on `globalThis`).

**"prepare statement" errors**
The transaction-mode pooler does not support prepared statements. Keep
`pgbouncer=true` in `DATABASE_URL`.

---

## 8. Updating a deployment

```bash
git pull
npm test
npm run build
git push
```

Vercel rebuilds automatically. If the change includes a database migration,
apply it with `npm run db:migrate` **before** the new build starts serving
traffic, or deploy with the migrations applied first.
