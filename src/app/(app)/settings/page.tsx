import { SettingsView } from "@/components/settings/settings-view";
import { prisma } from "@/lib/db";
import { getRounds } from "@/lib/data/rounds";
import { toNumber } from "@/lib/data/rounds";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [rounds, memberCount, obligationTotals] = await Promise.all([
    getRounds(),
    prisma.member.count(),
    prisma.contributionObligation.aggregate({
      where: { isApplicable: true },
      _sum: { expectedAmount: true },
    }),
  ]);

  return (
    <SettingsView
      rounds={rounds}
      memberCount={memberCount}
      totalExpected={toNumber(obligationTotals._sum.expectedAmount)}
    />
  );
}
