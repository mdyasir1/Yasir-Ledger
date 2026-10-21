import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Collections and payouts for the selected month."
      />
      <p className="text-sm text-muted-foreground">
        The dashboard is connected to the database in the next phase.
      </p>
    </div>
  );
}
