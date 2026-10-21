import { TransactionsView } from "@/components/transactions/transactions-view";
import {
  getTransactionFilterOptions,
  getTransactions,
} from "@/lib/data/transactions";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const single = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const filters = {
    roundId: single("roundId"),
    memberId: single("memberId"),
    paymentMethod: single("paymentMethod") as
      | "upi"
      | "bank_transfer"
      | "cash"
      | "other"
      | undefined,
    from: single("from"),
    to: single("to"),
    status: single("status") as "all" | "valid" | undefined,
  };

  const [transactions, options] = await Promise.all([
    getTransactions(filters),
    getTransactionFilterOptions(),
  ]);

  return (
    <TransactionsView
      transactions={transactions}
      options={options}
      currentFilters={{
        roundId: filters.roundId,
        memberId: filters.memberId,
        paymentMethod: filters.paymentMethod,
        from: filters.from,
        to: filters.to,
        status: filters.status,
      }}
    />
  );
}
