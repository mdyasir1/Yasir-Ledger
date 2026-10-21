# Yasir Ledger

Yasir Ledger is a small private web app that Yasir uses to run his cheeti.

## What it does

Yasir runs a ten month cheeti, from October 2026 to July 2027. Seventeen people
each pay a fixed amount every month, so the round collects Rs 1,00,000. At the
end of a month the money is handed to whoever is scheduled to receive it that
month. Some months have one person receiving, some months have three.

The app keeps track of that. It shows who has paid, who has not, how much is
still outstanding, who is due a payout, and what has already been handed over.
Payments are typed in by hand after Yasir sees them in the bank, because
recording one should take a few seconds on a phone.

## The scheme

- Seventeen members
- Ten rounds, October 2026 to July 2027
- Rs 1,00,000 collected each month
- Contributions range from Rs 2,000 to Rs 12,500
- A member may pay in instalments, and every payment is kept as its own entry
- A wrong entry is reversed, never deleted, so the history stays true

## Running it

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

The database is a Supabase Postgres project. The app talks to it through
Prisma, so there is no Docker, no Python and no psql involved.

The full plan, the security model, the backup routine, the deployment steps and
a record of how the app was built are all in
[docs/YASIR_LEDGER_PLAN.md](./docs/YASIR_LEDGER_PLAN.md).

## Who made it

Built and run by Yasir.
