"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { reversePayment } from "@/app/actions/payments";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/datetime";
import { toCsv } from "@/lib/finance/csv";
import { formatPaise } from "@/lib/money";
import type {
  TransactionFilterOptions,
  TransactionRow,
} from "@/lib/data/transactions";

const METHODS = [
  { value: "all", label: "All methods" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

/** The Transactions screen: the complete searchable ledger. */
export function TransactionsView({
  transactions,
  options,
  currentFilters,
}: {
  transactions: TransactionRow[];
  options: TransactionFilterOptions;
  currentFilters: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [reversing, setReversing] = useState<TransactionRow | null>(null);

  function updateFilter(key: string, value: string | null | undefined) {
    if (value === null) return;
    const params = new URLSearchParams();
    for (const [name, entry] of Object.entries(currentFilters)) {
      if (entry && name !== key) params.set(name, entry);
    }
    if (value) params.set(key, value);

    const query = params.toString();
    router.push(query ? `/transactions?${query}` : "/transactions", {
      scroll: false,
    });
  }

  function exportCsv() {
    const csv = toCsv(
      transactions.map((transaction) => ({
        receivedAt: transaction.receivedAt,
        fullName: transaction.memberName,
        roundName: transaction.roundName,
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod,
        transactionReference: transaction.transactionReference,
        note: transaction.note,
        status: transaction.isReversal
          ? "reversal"
          : transaction.isReversed
            ? "reversed"
            : "valid",
      })),
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yasir-ledger-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${transactions.length} transaction(s).`);
  }

  const total = transactions
    .filter((transaction) => transaction.isValid)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description={`${transactions.length} entr${transactions.length === 1 ? "y" : "ies"} · ${formatPaise(total)} counts towards the collection`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={transactions.length === 0}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <Card className="shadow-none">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="filter-round">Month</Label>
            <Select
              value={currentFilters.roundId ?? "all"}
              onValueChange={(value) =>
                updateFilter("roundId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger id="filter-round" className="w-full">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {options.rounds.map((round) => (
                  <SelectItem key={round.id} value={round.id}>
                    {round.roundName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-member">Member</Label>
            <Select
              value={currentFilters.memberId ?? "all"}
              onValueChange={(value) =>
                updateFilter("memberId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger id="filter-member" className="w-full">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {options.members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-method">Method</Label>
            <Select
              value={currentFilters.paymentMethod ?? "all"}
              onValueChange={(value) =>
                updateFilter(
                  "paymentMethod",
                  value === "all" ? undefined : value,
                )
              }
            >
              <SelectTrigger id="filter-method" className="w-full">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-from">From</Label>
            <Input
              id="filter-from"
              type="date"
              defaultValue={currentFilters.from ?? ""}
              onChange={(event) =>
                updateFilter("from", event.target.value || undefined)
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-to">To</Label>
            <Input
              id="filter-to"
              type="date"
              defaultValue={currentFilters.to ?? ""}
              onChange={(event) =>
                updateFilter("to", event.target.value || undefined)
              }
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-5">
            <Label htmlFor="filter-status">Status</Label>
            <Select
              value={currentFilters.status ?? "all"}
              onValueChange={(value) =>
                updateFilter("status", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger id="filter-status" className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entries, including reversed</SelectItem>
                <SelectItem value="valid">Only valid transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {transactions.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No transactions match these filters.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(transaction.receivedAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.memberName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.roundName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPaise(transaction.amount)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {transaction.paymentMethod.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.transactionReference ?? "—"}
                  </TableCell>
                  <TableCell>
                    {transaction.isReversal ? (
                      <Badge variant="secondary">Reversal</Badge>
                    ) : transaction.isReversed ? (
                      <Badge
                        variant="outline"
                        className="text-red-600 dark:text-red-400"
                      >
                        Reversed
                      </Badge>
                    ) : (
                      <Badge variant="outline">Valid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.isValid ? (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" />
                          }
                        >
                          <Undo2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">
                            Reverse {transaction.memberName}&apos;s payment
                          </span>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reverse this payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {formatPaise(transaction.amount)} received from{" "}
                              {transaction.memberName} on{" "}
                              {formatDateTime(transaction.receivedAt)} will no
                              longer count towards the collection. The original
                              entry stays in the ledger and a reversal entry is
                              added, so the history is preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                const result = await reversePayment({
                                  paymentId: transaction.id,
                                  reason: "Reversed from the transactions ledger",
                                });
                                if (result.ok) {
                                  toast.success("Payment reversed.");
                                } else {
                                  toast.error(result.error);
                                }
                              }}
                            >
                              Reverse payment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
