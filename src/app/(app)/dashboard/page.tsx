import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionProgress } from "@/components/collection-progress";
import { RoundSelector } from "@/components/round-selector";
import { StatCard, StatGrid } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNextScheduledRound, getRecentPayments } from "@/lib/data/activity";
import { getRoundCollection } from "@/lib/data/collection";
import { getRounds, resolveSelectedRound } from "@/lib/data/rounds";
import { formatDateTime } from "@/lib/datetime";
import { reconcileRound } from "@/lib/finance/reconciliation";
import { formatPaise } from "@/lib/money";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rounds = await getRounds();
  const selected = resolveSelectedRound(rounds, params.round as string | undefined);

  if (!selected) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <p className="text-sm text-muted-foreground">
          No monthly rounds have been created yet.
        </p>
      </div>
    );
  }

  const [collection, recentPayments, nextRound] = await Promise.all([
    getRoundCollection(selected.id),
    getRecentPayments(8),
    getNextScheduledRound(),
  ]);

  if (!collection) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <p className="text-sm text-muted-foreground">
          That month could not be loaded.
        </p>
      </div>
    );
  }

  const { summary } = collection;
  const warnings = reconcileRound({
    summary,
    positions: collection.positions,
    plannedPayoutTotal: collection.plannedPayoutTotal,
    actualPayoutTotal: collection.actualPayoutTotal,
    isRoundOpen: selected.status === "open",
  });

  const needingReminders = collection.positions.filter(
    (position) =>
      position.status === "not_paid" || position.status === "partially_paid",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={selected.roundName}
        description="Collections and payouts for the selected month."
        actions={
          <RoundSelector
            rounds={rounds.map((round) => ({
              id: round.id,
              roundName: round.roundName,
            }))}
            selectedId={selected.id}
            searchParams={{
              round: selected.id,
            }}
          />
        }
      />

      <StatGrid>
        <StatCard
          label="Expected"
          value={formatPaise(summary.expectedTotal)}
          hint={`Target ${formatPaise(selected.collectionTarget)}`}
          icon={Wallet}
        />
        <StatCard
          label="Collected"
          value={formatPaise(summary.collectedTotal)}
          tone={summary.collectedTotal >= summary.expectedTotal ? "positive" : "default"}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Outstanding"
          value={formatPaise(summary.outstandingTotal)}
          tone={summary.outstandingTotal > 0 ? "critical" : "positive"}
          icon={Clock}
        />
        <StatCard
          label="Members paid"
          value={`${summary.paidCount} of ${summary.memberCount - summary.notApplicableCount}`}
          hint={`${summary.partiallyPaidCount} partial · ${summary.pendingCount} pending`}
          icon={Users}
        />
      </StatGrid>

      <Card className="shadow-none">
        <CardContent className="p-4">
          <CollectionProgress value={summary.collectionProgress} />
        </CardContent>
      </Card>

      {warnings.length > 0 ? (
        <Card className="shadow-none border-amber-300 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle
                className="size-4 text-amber-600"
                aria-hidden="true"
              />
              Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {warnings.map((warning) => (
              <p
                key={warning.code}
                className="flex items-start gap-2 text-sm"
                role={warning.severity === "critical" ? "alert" : undefined}
              >
                <span
                  className={
                    warning.severity === "critical"
                      ? "font-medium text-red-600 dark:text-red-400"
                      : warning.severity === "warning"
                        ? "font-medium text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground"
                  }
                >
                  {warning.severity === "critical"
                    ? "Critical:"
                    : warning.severity === "warning"
                      ? "Check:"
                      : "Note:"}
                </span>
                <span>{warning.message}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4" aria-hidden="true" />
                Next payout
              </span>
              <Button variant="ghost" size="sm" render={<Link href="/timeline" />}>
                Timeline
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextRound ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {nextRound.roundName}
                </p>
                <ul className="space-y-1.5">
                  {nextRound.recipients.map((recipient) => (
                    <li
                      key={recipient.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{recipient.fullName}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatPaise(recipient.plannedAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Planned</p>
                    <p className="font-semibold tabular-nums">
                      {formatPaise(nextRound.plannedTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Disbursed</p>
                    <p className="font-semibold tabular-nums">
                      {formatPaise(nextRound.actualTotal)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recipients have been scheduled yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Clock className="size-4" aria-hidden="true" />
                Recent transactions
              </span>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/transactions" />}
              >
                All
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments have been recorded yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{payment.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.roundName} · {formatDateTime(payment.receivedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums font-medium">
                        {formatPaise(payment.amount)}
                      </p>
                      {payment.isReversal ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Reversal
                        </Badge>
                      ) : payment.isReversed ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-red-600"
                        >
                          Reversed
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" aria-hidden="true" />
            Need a reminder
            <Badge variant="secondary">{needingReminders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needingReminders.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2
                className="size-4 text-emerald-600"
                aria-hidden="true"
              />
              Everyone has paid for this month.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {needingReminders.slice(0, 8).map((position) => (
                <li
                  key={position.memberId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {position.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPaise(position.outstanding)} outstanding
                    </p>
                  </div>
                  <StatusBadge status={position.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
