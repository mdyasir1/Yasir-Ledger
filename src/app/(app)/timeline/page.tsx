import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Timeline" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Timeline" description="All ten rounds from October 2026 to July 2027." />
      <p className="text-sm text-muted-foreground">
        This screen is connected to the database in the next phase.
      </p>
    </div>
  );
}
