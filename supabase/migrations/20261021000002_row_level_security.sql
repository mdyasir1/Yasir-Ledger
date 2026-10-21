-- =============================================================================
-- Yasir Ledger, 0002 row level security
--
-- The project's publishable key is public by design. Anyone who obtains it must
-- not be able to read or write financial data through PostgREST.
--
-- This migration therefore:
--   1. revokes every table/sequence privilege from `anon` and `authenticated`;
--   2. enables RLS on every financial table;
--   3. creates NO policies for those roles, so RLS denies them by default;
--   4. makes `audit_logs` append-only for every role, including the owner.
--
-- The application connects as `postgres`, which holds BYPASSRLS, so the
-- application's own queries are not filtered. The effective administrator gate
-- is the signed session cookie enforced in src/proxy.ts and in every server
-- action. See SECURITY.md.
-- =============================================================================

-- ── 1. Revoke the public-facing privileges ─────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- ── 2. Enable RLS on every financial table ─────────────────────────────────
do $$
declare
  target text;
begin
  foreach target in array array[
    'members',
    'monthly_rounds',
    'contribution_obligations',
    'payments',
    'payouts',
    'share_groups',
    'share_group_members',
    'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    -- Also make the table owner subject to RLS, so that no role can read the
    -- data by accident through an owner-scoped session.
    execute format('alter table public.%I force row level security', target);
  end loop;
end
$$;

-- ── 3. No policies are created for anon / authenticated ────────────────────
-- With RLS enabled and no matching policy, every statement returns zero rows
-- and every write is rejected. This is the intended posture: the application
-- uses the `postgres` role (BYPASSRLS) through Prisma, and the administrator
-- gate is the session cookie, not a database role.
--
-- If Supabase Auth is ever introduced, add policies scoped to an `admin_emails`
-- allow-list at that point, following the pattern in docs/YASIR_LEDGER_PLAN.md.

-- ── 4. audit_logs is append-only ───────────────────────────────────────────
create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only: % is not permitted', tg_op
    using errcode = '42501';
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'audit_logs_append_only'
  ) then
    create trigger audit_logs_append_only
      before update or delete on public.audit_logs
      for each row execute function public.prevent_audit_log_mutation();
  end if;
end
$$;
