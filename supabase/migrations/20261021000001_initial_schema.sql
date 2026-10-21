-- =============================================================================
-- Yasir Ledger — 0001 initial schema
--
-- All monetary columns are integer PAISE in BIGINT columns.
-- Rs 1,00,000 = 10000000 paise. No floating point, no decimal.
--
-- This file is applied by `npm run db:migrate`, which records it in the
-- schema_migrations ledger. It is written to be re-runnable.
-- =============================================================================

-- ── Enumerated types ───────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'RoundStatus') then
    create type "RoundStatus" as enum ('open', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'PaymentMethod') then
    create type "PaymentMethod" as enum ('upi', 'bank_transfer', 'cash', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'PayoutStatus') then
    create type "PayoutStatus" as enum ('planned', 'paid', 'cancelled');
  end if;
end
$$;

-- ── members ────────────────────────────────────────────────────────────────
create table if not exists public.members (
  id                           uuid primary key default gen_random_uuid(),
  slug                         text        not null unique,
  full_name                    text        not null,
  phone_number                 text,
  default_contribution_amount  bigint      not null check (default_contribution_amount >= 0),
  is_active                    boolean     not null default true,
  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

comment on table public.members is
  'Scheme members. default_contribution_amount is in paise and is only a default: '
  'it never changes a recorded obligation or payment.';

-- ── monthly_rounds ─────────────────────────────────────────────────────────
create table if not exists public.monthly_rounds (
  id                uuid primary key default gen_random_uuid(),
  year              integer      not null check (year between 2000 and 2100),
  month             integer      not null check (month between 1 and 12),
  round_name        text         not null,
  collection_target bigint       not null check (collection_target >= 0),
  status            "RoundStatus" not null default 'open',
  notes             text,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),
  constraint monthly_rounds_year_month_key unique (year, month)
);

-- ── contribution_obligations ───────────────────────────────────────────────
create table if not exists public.contribution_obligations (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid        not null references public.monthly_rounds (id) on delete cascade,
  member_id       uuid        not null references public.members (id) on delete cascade,
  expected_amount bigint      not null check (expected_amount >= 0),
  is_applicable   boolean     not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint contribution_obligations_round_member_key unique (round_id, member_id)
);

-- ── payments ───────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  round_id              uuid           not null references public.monthly_rounds (id) on delete cascade,
  member_id             uuid           not null references public.members (id) on delete cascade,
  amount                bigint         not null check (amount > 0),
  payment_method        "PaymentMethod" not null,
  received_at           timestamptz    not null,
  transaction_reference text,
  note                  text,
  idempotency_key       text           not null unique,
  created_by            uuid           not null,
  reversal_of_payment_id uuid          references public.payments (id) on delete set null,
  created_at            timestamptz    not null default now(),
  constraint payments_no_self_reversal check (
    reversal_of_payment_id is null or reversal_of_payment_id <> id
  )
);

-- ── payouts ────────────────────────────────────────────────────────────────
create table if not exists public.payouts (
  id                    uuid primary key default gen_random_uuid(),
  round_id              uuid          not null references public.monthly_rounds (id) on delete cascade,
  recipient_member_id   uuid          not null references public.members (id) on delete cascade,
  planned_amount        bigint        not null check (planned_amount >= 0),
  actual_amount         bigint        check (actual_amount >= 0),
  status                "PayoutStatus" not null default 'planned',
  paid_at               timestamptz,
  transaction_reference text,
  note                  text,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  constraint payouts_round_recipient_key unique (round_id, recipient_member_id)
);

-- ── share_groups ───────────────────────────────────────────────────────────
create table if not exists public.share_groups (
  id                  uuid primary key default gen_random_uuid(),
  name                text        not null,
  target_share_amount bigint      not null check (target_share_amount >= 0),
  is_active           boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── share_group_members ────────────────────────────────────────────────────
create table if not exists public.share_group_members (
  id                    uuid primary key default gen_random_uuid(),
  share_group_id        uuid        not null references public.share_groups (id) on delete cascade,
  member_id             uuid        not null references public.members (id) on delete cascade,
  allocated_amount      bigint      not null check (allocated_amount >= 0),
  effective_from_round_id  uuid    references public.monthly_rounds (id) on delete set null,
  effective_until_round_id uuid    references public.monthly_rounds (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint share_group_members_group_member_key unique (share_group_id, member_id)
);

-- ── audit_logs ─────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text        not null,
  entity_type text        not null,
  entity_id   uuid,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);

-- ── updated_at triggers ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'members',
    'monthly_rounds',
    'contribution_obligations',
    'payouts',
    'share_groups',
    'share_group_members'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = target || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on public.%I
           for each row execute function public.set_updated_at()',
        target || '_set_updated_at',
        target
      );
    end if;
  end loop;
end
$$;

-- ── indexes ────────────────────────────────────────────────────────────────
create index if not exists payments_round_member_idx
  on public.payments (round_id, member_id);
create index if not exists payments_member_idx
  on public.payments (member_id);
create index if not exists payments_received_at_idx
  on public.payments (received_at);
create index if not exists payments_reversal_of_idx
  on public.payments (reversal_of_payment_id)
  where reversal_of_payment_id is not null;

create index if not exists contribution_obligations_member_idx
  on public.contribution_obligations (member_id);
create index if not exists contribution_obligations_round_idx
  on public.contribution_obligations (round_id);

create index if not exists payouts_round_idx
  on public.payouts (round_id);
create index if not exists payouts_recipient_idx
  on public.payouts (recipient_member_id);

create index if not exists share_group_members_member_idx
  on public.share_group_members (member_id);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at);
