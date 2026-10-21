import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Members" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Contribution defaults and payment history for every member." />
      <p className="text-sm text-muted-foreground">
        This screen is connected to the database in the next phase.
      </p>
    </div>
  );
}
