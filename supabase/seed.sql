-- =============================================================================
-- Yasir Ledger — idempotent seed
--
-- Loads the 17 members, the ten monthly rounds (October 2026 - July 2027),
-- the 170 contribution obligations and the 19 scheduled payouts.
--
-- This file contains NO payment history. The `payments` table starts empty,
-- because fabricating historical transactions is not permitted.
--
-- It is safe to run repeatedly:
--   * `ON CONFLICT DO NOTHING` means nothing is ever duplicated;
--   * existing rows are never overwritten, so administrator edits are kept;
--   * obligations are only created for the 17 seeded members, so a member
--     added later is never back-filled into historical rounds.
--
-- Amounts are in paise. Rs 1,00,000 = 10000000 paise.
--
-- Run it with `npm run db:seed`, or paste it into the Supabase SQL editor.
-- =============================================================================

-- ── 17 members ─────────────────────────────────────────────────────────────
insert into public.members (slug, full_name, default_contribution_amount)
values
  ('yasir',           'Yasir',             1000000),
  ('ibrahim',         'Ibrahim',           1000000),
  ('rahima',          'Rahima',            1000000),
  ('fatima',          'Fatima',             500000),
  ('rahila',          'Rahila',             500000),
  ('hidayat',         'Hidayat',            800000),
  ('sajidh',          'Sajidh',             200000),
  ('zeenata-badeami', 'Zeenata Badeami',   1250000),
  ('arshad-badeami',  'Arshad Badeami',     500000),
  ('khaise',          'Khaise',             250000),
  ('zaakir-aapa',     'Zaakir Aapa',        250000),
  ('afsar',           'Afsar',              250000),
  ('farhat',          'Farhat',             500000),
  ('shakir',          'Shakir',            1000000),
  ('zeenat-aunty',    'Zeenat Aunty',       250000),
  ('sumayya',         'Sumayya',            250000),
  ('munni-aunty',     'Munni Aunty',        500000)
on conflict (slug) do nothing;

-- ── Ten monthly rounds ─────────────────────────────────────────────────────
insert into public.monthly_rounds (year, month, round_name, collection_target)
values
  (2026, 10, 'October 2026',  10000000),
  (2026, 11, 'November 2026', 10000000),
  (2026, 12, 'December 2026', 10000000),
  (2027,  1, 'January 2027',  10000000),
  (2027,  2, 'February 2027', 10000000),
  (2027,  3, 'March 2027',    10000000),
  (2027,  4, 'April 2027',    10000000),
  (2027,  5, 'May 2027',      10000000),
  (2027,  6, 'June 2027',     10000000),
  (2027,  7, 'July 2027',     10000000)
on conflict (year, month) do nothing;

-- ── 170 contribution obligations (17 members x 10 rounds) ───────────────────
-- The expected amount is taken from the table above rather than from
-- `members.default_contribution_amount`, so the seeded history always matches
-- the plan even if a default was edited beforehand.
with seed_members(slug, amount) as (
  values
    ('yasir',           1000000::bigint),
    ('ibrahim',         1000000::bigint),
    ('rahima',          1000000::bigint),
    ('fatima',           500000::bigint),
    ('rahila',           500000::bigint),
    ('hidayat',          800000::bigint),
    ('sajidh',           200000::bigint),
    ('zeenata-badeami', 1250000::bigint),
    ('arshad-badeami',   500000::bigint),
    ('khaise',           250000::bigint),
    ('zaakir-aapa',      250000::bigint),
    ('afsar',            250000::bigint),
    ('farhat',           500000::bigint),
    ('shakir',           1000000::bigint),
    ('zeenat-aunty',     250000::bigint),
    ('sumayya',          250000::bigint),
    ('munni-aunty',      500000::bigint)
)
insert into public.contribution_obligations (round_id, member_id, expected_amount)
select r.id, m.id, s.amount
from public.monthly_rounds r
cross join seed_members s
join public.members m on m.slug = s.slug
on conflict (round_id, member_id) do nothing;

-- ── 19 scheduled payouts ───────────────────────────────────────────────────
-- `planned_amount` starts as the recipient's own contribution. It is a
-- starting value only: the application never derives payouts, they are stored
-- and edited on the Timeline screen.
with schedule(year, month, slug, amount) as (
  values
    (2026, 10, 'yasir',           1000000::bigint),
    (2026, 11, 'ibrahim',         1000000::bigint),
    (2026, 12, 'fatima',           500000::bigint),
    (2026, 12, 'rahila',           500000::bigint),
    (2027,  1, 'hidayat',          800000::bigint),
    (2027,  1, 'sajidh',           200000::bigint),
    (2027,  2, 'zeenata-badeami', 1250000::bigint),
    (2027,  3, 'arshad-badeami',   500000::bigint),
    (2027,  3, 'khaise',           250000::bigint),
    (2027,  3, 'zaakir-aapa',      250000::bigint),
    (2027,  4, 'zeenata-badeami', 1250000::bigint),
    (2027,  4, 'afsar',            250000::bigint),
    (2027,  4, 'farhat',           500000::bigint),
    (2027,  5, 'rahima',          1000000::bigint),
    (2027,  5, 'rahila',           500000::bigint),
    (2027,  6, 'shakir',          1000000::bigint),
    (2027,  7, 'zeenat-aunty',     250000::bigint),
    (2027,  7, 'sumayya',          250000::bigint),
    (2027,  7, 'munni-aunty',      500000::bigint)
)
insert into public.payouts (round_id, recipient_member_id, planned_amount)
select r.id, m.id, s.amount
from schedule s
join public.monthly_rounds r on r.year = s.year and r.month = s.month
join public.members m on m.slug = s.slug
on conflict (round_id, recipient_member_id) do nothing;

-- ── Nothing else: the payments table is intentionally left empty ────────────
