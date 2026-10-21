import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Settings" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Scheme configuration and administrator details." />
      <p className="text-sm text-muted-foreground">
        This screen is connected to the database in the next phase.
      </p>
    </div>
  );
}
