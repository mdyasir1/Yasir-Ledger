"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/datetime";
import { formatPaise } from "@/lib/money";
import type { MemberRow } from "@/lib/data/members";
import { AddMemberButton, EditMemberButton, MemberDialog } from "./member-dialog";

/** The Members screen. */
export function MembersView({ members }: { members: MemberRow[] }) {
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [adding, setAdding] = useState(false);

  const totalCollected = members.reduce(
    (sum, member) => sum + member.collectedTotal,
    0,
  );
  const totalOutstanding = members.reduce(
    (sum, member) => sum + member.outstandingTotal,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length} members · ${formatPaise(
          totalCollected,
        )} recorded · ${formatPaise(totalOutstanding)} outstanding across the scheme`}
        actions={<AddMemberButton onOpen={() => setAdding(true)} />}
      />

      {/* Mobile: compact cards */}
      <div className="space-y-2 lg:hidden">
        {members.map((member) => (
          <Card key={member.id} className="shadow-none">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPaise(member.defaultContributionAmount)} per month
                    {member.phoneNumber ? ` · ${member.phoneNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!member.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
                  <EditMemberButton member={member} onOpen={() => setEditing(member)} />
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Collected</dt>
                  <dd className="tabular-nums">{formatPaise(member.collectedTotal)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Outstanding</dt>
                  <dd className="tabular-nums">{formatPaise(member.outstandingTotal)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Payments</dt>
                  <dd className="tabular-nums">{member.paymentCount}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Default</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Last payment</TableHead>
              <TableHead className="text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {member.fullName}
                    {!member.isActive ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.phoneNumber ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPaise(member.defaultContributionAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPaise(member.collectedTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {member.outstandingTotal > 0 ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatPaise(member.outstandingTotal)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.lastPaymentAt ? formatDate(member.lastPaymentAt) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <EditMemberButton
                    member={member}
                    onOpen={() => setEditing(member)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <MemberDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          member={editing}
        />
      ) : null}

      <MemberDialog
        open={adding}
        onOpenChange={setAdding}
        member={null}
      />
    </div>
  );
}
