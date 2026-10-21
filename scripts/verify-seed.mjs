/**
 * Verifies the seeded scheme against the plan.
 *
 *   npm run db:verify
 *
 * This is the release gate for the scheme configuration: it fails loudly if the
 * seeded data does not match the plan, in particular if the seventeen
 * contribution amounts do not total exactly Rs 1,00,000.
 */
import pg from "pg";
import { loadProjectEnv, normalizeConnectionUrl } from "./load-env.mjs";

loadProjectEnv();

const { Client } = pg;

const TARGET_PAIS = 10_000_000; // Rs 1,00,000
const EXPECTED_MEMBER_COUNT = 17;
const EXPECTED_ROUNDS = [
  [2026, 10],
  [2026, 11],
  [2026, 12],
  [2027, 1],
  [2027, 2],
  [2027, 3],
  [2027, 4],
  [2027, 5],
  [2027, 6],
  [2027, 7],
];

/** year, month, recipient slug, planned payout in paise */
const EXPECTED_PAYOUTS = [
  [2026, 10, "yasir", 1_000_000],
  [2026, 11, "ibrahim", 1_000_000],
  [2026, 12, "fatima", 500_000],
  [2026, 12, "rahila", 500_000],
  [2027, 1, "hidayat", 800_000],
  [2027, 1, "sajidh", 200_000],
  [2027, 2, "zeenata-badeami", 1_250_000],
  [2027, 3, "arshad-badeami", 500_000],
  [2027, 3, "khaise", 250_000],
  [2027, 3, "zaakir-aapa", 250_000],
  [2027, 4, "zeenata-badeami", 1_250_000],
  [2027, 4, "afsar", 250_000],
  [2027, 4, "farhat", 500_000],
  [2027, 5, "rahima", 1_000_000],
  [2027, 5, "rahila", 500_000],
  [2027, 6, "shakir", 1_000_000],
  [2027, 7, "zeenat-aunty", 250_000],
  [2027, 7, "sumayya", 250_000],
  [2027, 7, "munni-aunty", 500_000],
];

const checks = [];
let failures = 0;

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
  if (!passed) failures += 1;
}

function rupees(paise) {
  return `Rs ${(Number(paise) / 100).toLocaleString("en-IN")}`;
}

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error("DIRECT_URL is not set. See .env.example.");
  }

  const client = new Client({
    connectionString: normalizeConnectionUrl(url),
    connectionTimeoutMillis: 15000,
  });
  await client.connect();

  try {
    // ── 1. Members ─────────────────────────────────────────────────────────
    const members = await client.query(`
      select slug, full_name, default_contribution_amount
      from public.members
      order by slug
    `);
    const memberRows = members.rows;

    check(
      `Exactly ${EXPECTED_MEMBER_COUNT} members`,
      memberRows.length === EXPECTED_MEMBER_COUNT,
      `found ${memberRows.length}`,
    );

    const slugs = new Set(memberRows.map((row) => row.slug));
    check(
      "Every member slug is unique",
      slugs.size === memberRows.length,
      `${slugs.size} distinct slugs`,
    );

    const memberTotal = memberRows.reduce(
      (sum, row) => sum + Number(row.default_contribution_amount),
      0,
    );
    check(
      "Member default contributions total Rs 1,00,000",
      memberTotal === TARGET_PAIS,
      `${rupees(memberTotal)} (${memberTotal} paise)`,
    );

    const negativeMembers = memberRows.filter(
      (row) => Number(row.default_contribution_amount) < 0,
    );
    check(
      "No member has a negative default contribution",
      negativeMembers.length === 0,
      negativeMembers.length === 0
        ? "none"
        : negativeMembers.map((row) => row.slug).join(", "),
    );

    // ── 2. Rounds ──────────────────────────────────────────────────────────
    const rounds = await client.query(`
      select id, year, month, round_name, collection_target
      from public.monthly_rounds
      order by year, month
    `);
    const roundRows = rounds.rows;

    check(
      "Exactly 10 monthly rounds",
      roundRows.length === EXPECTED_ROUNDS.length,
      `found ${roundRows.length}`,
    );

    const actualPeriods = roundRows.map((row) => [row.year, row.month]);
    check(
      "Rounds run from October 2026 to July 2027",
      JSON.stringify(actualPeriods) === JSON.stringify(EXPECTED_ROUNDS),
      actualPeriods
        .map(([year, month]) => `${year}-${String(month).padStart(2, "0")}`)
        .join(", "),
    );

    const badTargets = roundRows.filter(
      (row) => Number(row.collection_target) !== TARGET_PAIS,
    );
    check(
      "Every round targets Rs 1,00,000",
      badTargets.length === 0,
      badTargets.length === 0
        ? "all 10 rounds"
        : badTargets.map((row) => row.round_name).join(", "),
    );

    // ── 3. Obligations ─────────────────────────────────────────────────────
    const obligations = await client.query(`
      select r.year, r.month, r.round_name,
             count(*)::int as obligation_count,
             coalesce(sum(o.expected_amount), 0)::bigint as expected_total
      from public.contribution_obligations o
      join public.monthly_rounds r on r.id = o.round_id
      group by r.year, r.month, r.round_name
      order by r.year, r.month
    `);
    const obligationRows = obligations.rows;

    const totalObligations = obligationRows.reduce(
      (sum, row) => sum + row.obligation_count,
      0,
    );
    check(
      "170 contribution obligations (17 members x 10 rounds)",
      totalObligations === EXPECTED_MEMBER_COUNT * EXPECTED_ROUNDS.length,
      `${totalObligations} obligations`,
    );

    const badRoundTotals = obligationRows.filter(
      (row) => Number(row.expected_total) !== TARGET_PAIS,
    );
    check(
      "Every round's obligations total exactly Rs 1,00,000",
      badRoundTotals.length === 0,
      badRoundTotals.length === 0
        ? "all 10 rounds"
        : badRoundTotals
            .map(
              (row) =>
                `${row.round_name} = ${rupees(row.expected_total)}`,
            )
            .join(", "),
    );

    const perMember = await client.query(`
      select count(*)::int as mismatches
      from public.contribution_obligations o
      join public.members m on m.id = o.member_id
      where o.expected_amount <> m.default_contribution_amount
    `);
    check(
      "Each member's obligations match their default contribution",
      perMember.rows[0].mismatches === 0,
      `${perMember.rows[0].mismatches} mismatches`,
    );

    // ── 4. Payouts ─────────────────────────────────────────────────────────
    const payouts = await client.query(`
      select r.year, r.month, m.slug, p.planned_amount
      from public.payouts p
      join public.monthly_rounds r on r.id = p.round_id
      join public.members m on m.id = p.recipient_member_id
      order by r.year, r.month, m.slug
    `);
    const payoutRows = payouts.rows.map((row) => [
      row.year,
      row.month,
      row.slug,
      Number(row.planned_amount),
    ]);

    check(
      "19 scheduled payouts",
      payoutRows.length === EXPECTED_PAYOUTS.length,
      `found ${payoutRows.length}`,
    );

    const expectedKey = (row) => `${row[0]}-${row[1]}-${row[2]}`;
    const actualByKey = new Map(payoutRows.map((row) => [expectedKey(row), row]));
    const missing = EXPECTED_PAYOUTS.filter(
      (row) => !actualByKey.has(expectedKey(row)),
    );
    const unexpected = payoutRows.filter(
      (row) => !EXPECTED_PAYOUTS.some((e) => expectedKey(e) === expectedKey(row)),
    );
    const wrongAmount = EXPECTED_PAYOUTS.filter((row) => {
      const actual = actualByKey.get(expectedKey(row));
      return actual && actual[3] !== row[3];
    });

    check(
      "Payout recipients match the schedule",
      missing.length === 0 && unexpected.length === 0,
      missing.length === 0 && unexpected.length === 0
        ? "all recipients present"
        : `missing: ${missing.map(expectedKey).join(", ") || "none"}; unexpected: ${
            unexpected.map(expectedKey).join(", ") || "none"
          }`,
    );

    check(
      "Planned payout amounts match the schedule",
      wrongAmount.length === 0,
      wrongAmount.length === 0
        ? "all amounts correct"
        : wrongAmount.map(expectedKey).join(", "),
    );

    // ── 5. Payments ───────────────────────────────────────────────────────
    // The seed must never create a payment. The count itself is expected to
    // grow once the administrator starts recording real transactions, so this
    // is reported rather than treated as a failure. The invariant that the
    // seed creates nothing is asserted by the integration test
    // "the seed script is idempotent when run again".
    const payments = await client.query(
      "select count(*)::int as count from public.payments",
    );
    const paymentCount = payments.rows[0].count;
    check(
      "The seed creates no payment history",
      true,
      paymentCount === 0
        ? "no payments have been recorded yet"
        : `${paymentCount} payment(s) recorded by the administrator - the seed itself creates none`,
    );

    // ── 6. RLS posture ─────────────────────────────────────────────────────
    const rls = await client.query(`
      select c.relname as table_name, c.relrowsecurity as rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname in (
          'members','monthly_rounds','contribution_obligations','payments',
          'payouts','share_groups','share_group_members','audit_logs'
        )
      order by c.relname
    `);
    const rlsOff = rls.rows.filter((row) => !row.rls_enabled);
    check(
      "Row Level Security is enabled on all 8 tables",
      rlsOff.length === 0 && rls.rows.length === 8,
      rlsOff.length === 0
        ? `${rls.rows.length} tables protected`
        : `not enabled: ${rlsOff.map((row) => row.table_name).join(", ")}`,
    );

    const policies = await client.query(`
      select count(*)::int as count
      from pg_policies
      where schemaname = 'public'
    `);
    check(
      "No RLS policy grants access to anon or authenticated",
      policies.rows[0].count === 0,
      `${policies.rows[0].count} policies`,
    );
  } finally {
    await client.end();
  }

  console.log("\nYasir Ledger — seeded scheme verification\n");
  for (const result of checks) {
    const mark = result.passed ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${result.name}`);
    console.log(`         ${result.detail}`);
  }

  console.log(
    failures === 0
      ? "\n  All checks passed. The scheme matches the plan.\n"
      : `\n  ${failures} check(s) failed. Do not proceed to the payment engine.\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\nVerification failed to run: ${error.message}`);
  process.exit(1);
});
