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
          <Card key={member.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.875rem] font-medium">
                    {member.fullName}
                  </p>
                  <p className="numeric mt-0.5 text-[0.75rem] text-muted-foreground">
                    {formatPaise(member.defaultContributionAmount)} per month
                    {member.phoneNumber ? ` · ${member.phoneNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!member.isActive ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : null}
                  <EditMemberButton
                    member={member}
                    onOpen={() => setEditing(member)}
                  />
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-border/70 pt-3 text-[0.8125rem]">
                <div>
                  <dt className="eyebrow">Collected</dt>
                  <dd className="numeric mt-1 font-medium">
                    {formatPaise(member.collectedTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Outstanding</dt>
                  <dd className="numeric mt-1 font-medium">
                    {formatPaise(member.outstandingTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Payments</dt>
                  <dd className="numeric mt-1 font-medium">
                    {member.paymentCount}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.06] lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
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
              <TableRow
                key={member.id}
                className="border-border/60 transition-colors hover:bg-muted/25"
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2 text-[0.8125rem]">
                    {member.fullName}
                    {!member.isActive ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-[0.8125rem] text-muted-foreground">
                  {member.phoneNumber ?? "-"}
                </TableCell>
                <TableCell className="numeric text-right text-[0.8125rem]">
                  {formatPaise(member.defaultContributionAmount)}
                </TableCell>
                <TableCell className="numeric text-right text-[0.8125rem]">
                  {formatPaise(member.collectedTotal)}
                </TableCell>
                <TableCell className="numeric text-right text-[0.8125rem]">
                  {member.outstandingTotal > 0 ? (
                    <span className="font-medium text-destructive">
                      {formatPaise(member.outstandingTotal)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">-</span>
                  )}
                </TableCell>
                <TableCell className="text-[0.8125rem] text-muted-foreground">
                  {member.lastPaymentAt
                    ? formatDate(member.lastPaymentAt)
                    : "-"}
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
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          member={editing}
        />
      ) : null}

      <MemberDialog open={adding} onOpenChange={setAdding} member={null} />
    </div>
  );
}
