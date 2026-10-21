"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  History,
  IndianRupee,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/datetime";
import {
  PAYMENT_METHOD_LABELS,
  type MemberPosition,
  type PaymentStatus,
} from "@/lib/finance/types";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PaymentRow } from "@/lib/data/collection";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { ReminderDialog } from "./reminder-dialog";

type Filter =
  | "all"
  | "pending"
  | "partially_paid"
  | "paid"
  | "overpaid"
  | "not_applicable";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overpaid", label: "Overpaid" },
  { value: "not_applicable", label: "Not applicable" },
];

function matchesFilter(status: PaymentStatus, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "not_paid";
  return status === filter;
}

/**
 * The Collections screen.
 *
 * On a phone each member is a compact card. On a wide screen the same data is
 * shown as a table. Both use the same numbers.
 */
export function CollectionsView({
  roundId,
  roundName,
  positions,
  payments,
}: {
  roundId: string;
  roundName: string;
  positions: MemberPosition[];
  payments: PaymentRow[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    position: MemberPosition;
    idempotencyKey: string;
  } | null>(null);
  const [reminderTarget, setReminderTarget] = useState<MemberPosition | null>(
    null,
  );

  const paymentsByMember = useMemo(() => {
    const grouped = new Map<string, PaymentRow[]>();
    for (const payment of payments) {
      const list = grouped.get(payment.memberId) ?? [];
      list.push(payment);
      grouped.set(payment.memberId, list);
    }
    return grouped;
  }, [payments]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return positions.filter((position) => {
      if (!matchesFilter(position.status, filter)) return false;
      if (!term) return true;
      return position.fullName.toLowerCase().includes(term);
    });
  }, [positions, filter, search]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: positions.length,
      pending: 0,
      partially_paid: 0,
      paid: 0,
      overpaid: 0,
      not_applicable: 0,
    };
    for (const position of positions) {
      if (position.status === "not_paid") result.pending += 1;
      else if (position.status !== "not_applicable") result[position.status] += 1;
    }
    return result;
  }, [positions]);

  function openPayment(position: MemberPosition) {
    setPaymentTarget({
      position,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members"
            aria-label="Search members by name"
            className="h-10 pl-9"
          />
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter members"
        >
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setFilter(entry.value)}
              aria-pressed={filter === entry.value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors duration-150",
                filter === entry.value
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/80 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {entry.label}
              <span className="numeric ml-1.5 opacity-60">
                {counts[entry.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 px-4 py-14 text-center">
          <p className="font-display text-[0.95rem] font-semibold">
            No members match
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            Try a different filter or clear the search.
          </p>
        </div>
      ) : null}

      {/* Mobile: compact cards */}
      <div className="space-y-2 lg:hidden">
        {visible.map((position) => {
          const history = paymentsByMember.get(position.memberId) ?? [];
          const isOpen = expanded === position.memberId;

          return (
            <div
              key={position.memberId}
              className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.06]"
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : position.memberId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[0.875rem] font-medium">
                      {position.fullName}
                    </span>
                    <StatusBadge status={position.status} />
                  </div>
                  <p className="numeric mt-1 text-[0.75rem] text-muted-foreground">
                    Expected {formatPaise(position.expectedAmount)} · Paid{" "}
                    {formatPaise(position.paidAmount)}
                    {position.outstanding > 0 ? (
                      <>
                        {" · "}
                        <span className="font-medium text-destructive">
                          Due {formatPaise(position.outstanding)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </button>

              {isOpen ? (
                <div className="space-y-3 border-t border-border/70 bg-muted/30 px-4 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openPayment(position)}>
                      <IndianRupee className="size-4" aria-hidden="true" />
                      Record
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReminderTarget(position)}
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      Remind
                    </Button>
                    {position.phoneNumber ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        render={
                          <a
                            href={`tel:${position.phoneNumber.replace(/[^\d+]/g, "")}`}
                          />
                        }
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        Call
                      </Button>
                    ) : null}
                  </div>

                  <PaymentHistory history={history} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.06] lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((position) => {
              const history = paymentsByMember.get(position.memberId) ?? [];
              const isOpen = expanded === position.memberId;

              return (
                <>
                  <TableRow
                    key={position.memberId}
                    className="border-border/60 transition-colors hover:bg-muted/25"
                  >
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : position.memberId)}
                        className="flex items-center gap-1.5 text-left"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronDown
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronRight
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-[0.8125rem]">
                          {position.fullName}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="numeric text-right text-[0.8125rem]">
                      {formatPaise(position.expectedAmount)}
                    </TableCell>
                    <TableCell className="numeric text-right text-[0.8125rem]">
                      {formatPaise(position.paidAmount)}
                    </TableCell>
                    <TableCell className="numeric text-right text-[0.8125rem]">
                      {position.outstanding > 0 ? (
                        <span className="font-medium text-destructive">
                          {formatPaise(position.outstanding)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={position.status} />
                    </TableCell>
                    <TableCell className="text-[0.8125rem] text-muted-foreground">
                      {position.latestPaymentAt
                        ? formatDate(position.latestPaymentAt)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPayment(position)}
                        >
                          Record
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remind ${position.fullName}`}
                          onClick={() => setReminderTarget(position)}
                        >
                          <MessageCircle className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {isOpen ? (
                    <TableRow key={`${position.memberId}-history`}>
                      <TableCell
                        colSpan={7}
                        className="bg-muted/30 px-3 py-3"
                      >
                        <PaymentHistory history={history} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {paymentTarget ? (
        <RecordPaymentDialog
          open
          onOpenChange={(open) => {
            if (!open) setPaymentTarget(null);
          }}
          roundId={roundId}
          roundName={roundName}
          memberId={paymentTarget.position.memberId}
          memberName={paymentTarget.position.fullName}
          outstandingAmount={paymentTarget.position.outstanding}
          expectedAmount={paymentTarget.position.expectedAmount}
          paidAmount={paymentTarget.position.paidAmount}
          idempotencyKey={paymentTarget.idempotencyKey}
        />
      ) : null}

      {reminderTarget ? (
        <ReminderDialog
          open
          onOpenChange={(open) => {
            if (!open) setReminderTarget(null);
          }}
          fullName={reminderTarget.fullName}
          roundName={roundName}
          position={reminderTarget}
        />
      ) : null}
    </div>
  );
}

/** The expandable payment history for one member. */
function PaymentHistory({ history }: { history: PaymentRow[] }) {
  if (history.length === 0) {
    return (
      <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
        <History className="size-4" aria-hidden="true" />
        No payments recorded yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {history.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]"
        >
          <span className="numeric font-medium">
            {formatPaise(payment.amount)}
          </span>
          <span className="text-muted-foreground">
            {formatDateTime(payment.receivedAt)}
          </span>
          <span className="text-muted-foreground">
            {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
          </span>
          {payment.transactionReference ? (
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              {payment.transactionReference}
            </span>
          ) : null}
          {payment.isReversal ? (
            <span className="font-medium text-violet-700 dark:text-violet-300">
              Reversal entry
            </span>
          ) : payment.isReversed ? (
            <span className="font-medium text-destructive">Reversed</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
