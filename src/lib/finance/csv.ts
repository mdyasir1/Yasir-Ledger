import { formatPaise } from "@/lib/money";
import type { StoredPayment } from "./types";

export type CsvRow = {
  receivedAt: Date;
  fullName: string;
  roundName: string;
  amount: number;
  paymentMethod: StoredPayment["paymentMethod"];
  transactionReference: string | null;
  note: string | null;
  status: "valid" | "reversed" | "reversal";
};

/**
 * Serialises the transaction ledger to CSV.
 *
 * Fields are quoted and embedded quotes are doubled, so a note containing a
 * comma or a quote cannot break the file.
 */
export function toCsv(rows: CsvRow[]): string {
  const header = [
    "Date",
    "Time",
    "Member",
    "Round",
    "Amount",
    "Payment method",
    "Reference",
    "Status",
    "Note",
  ];

  const lines = [header.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.receivedAt.toISOString().slice(0, 10),
        row.receivedAt.toISOString().slice(11, 16),
        row.fullName,
        row.roundName,
        formatPaise(row.amount),
        row.paymentMethod,
        row.transactionReference ?? "",
        row.status,
        row.note ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return lines.join("\r\n");
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
