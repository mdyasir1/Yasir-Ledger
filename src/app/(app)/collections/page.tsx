import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Collections" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Collections" description="Who has paid, who is pending, and what is outstanding." />
      <p className="text-sm text-muted-foreground">
        This screen is connected to the database in the next phase.
      </p>
    </div>
  );
}
