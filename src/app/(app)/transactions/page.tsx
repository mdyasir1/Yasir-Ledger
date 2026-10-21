import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Transactions" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Complete searchable ledger of every payment." />
      <p className="text-sm text-muted-foreground">
        This screen is connected to the database in the next phase.
      </p>
    </div>
  );
}
