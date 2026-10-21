/**
 * Verifies the application's real data path: the generated Prisma client over
 * the transaction-mode pooler.
 *
 *   npm run db:prisma-check
 *
 * `db:check` proves the raw `pg` driver can reach the database. This proves
 * the ORM the application itself uses can do the same, and that the schema in
 * `prisma/schema.prisma` still matches the tables that were migrated.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

const TARGET_PAIS = 10_000_000n;

async function main() {
  const [members, rounds, obligations, payouts, payments] = await Promise.all([
    prisma.member.count(),
    prisma.monthlyRound.count(),
    prisma.contributionObligation.count(),
    prisma.payout.count(),
    prisma.payment.count(),
  ]);

  const total = await prisma.member.aggregate({
    _sum: { defaultContributionAmount: true },
  });

  const october = await prisma.monthlyRound.findUnique({
    where: { year_month: { year: 2026, month: 10 } },
    include: {
      obligations: {
        include: { member: true },
        orderBy: { member: { fullName: "asc" } },
      },
      payouts: { include: { recipient: true } },
    },
  });

  const octoberTotal = october?.obligations.reduce(
    (sum, obligation) => sum + obligation.expectedAmount,
    0n,
  );

  const byStatus = await prisma.contributionObligation.groupBy({
    by: ["isApplicable"],
    _count: true,
  });

  console.log("\nYasir Ledger: Prisma data-path check\n");
  console.log(`  members                 ${members}`);
  console.log(`  monthly_rounds          ${rounds}`);
  console.log(`  contribution_obligations${String(obligations).padStart(4)}`);
  console.log(`  payouts                 ${payouts}`);
  console.log(`  payments                ${payments}`);
  console.log(
    `  sum of member defaults  Rs ${(Number(total._sum.defaultContributionAmount) / 100).toLocaleString("en-IN")}`,
  );
  console.log(
    `  October 2026 expected   Rs ${(Number(octoberTotal ?? 0n) / 100).toLocaleString("en-IN")} across ${october?.obligations.length ?? 0} obligations`,
  );
  console.log(
    `  October 2026 recipients ${october?.payouts.map((payout) => payout.recipient.fullName).join(", ") || "none"}`,
  );
  console.log(
    `  applicable obligations  ${byStatus.find((row) => row.isApplicable)?._count ?? 0} applicable, ${byStatus.find((row) => !row.isApplicable)?._count ?? 0} not applicable`,
  );

  const problems: string[] = [];

  if (members !== 17) problems.push(`expected 17 members, found ${members}`);
  if (rounds !== 10) problems.push(`expected 10 rounds, found ${rounds}`);
  if (obligations !== 170) problems.push(`expected 170 obligations, found ${obligations}`);
  if (payouts !== 19) problems.push(`expected 19 payouts, found ${payouts}`);
  if (total._sum.defaultContributionAmount !== TARGET_PAIS) {
    problems.push(
      `member defaults total ${total._sum.defaultContributionAmount} paise, expected ${TARGET_PAIS}`,
    );
  }
  if (octoberTotal !== TARGET_PAIS) {
    problems.push(
      `October 2026 obligations total ${octoberTotal} paise, expected ${TARGET_PAIS}`,
    );
  }
  if (payments !== 0) {
    problems.push(`expected 0 payments, found ${payments}`);
  }

  if (problems.length > 0) {
    console.log("\n  PROBLEMS:");
    for (const problem of problems) console.log(`   - ${problem}`);
    console.log("");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("\n  Prisma data path is healthy.\n");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(`\nPrisma check failed: ${error.message}`);
  await prisma.$disconnect();
  process.exit(1);
});
