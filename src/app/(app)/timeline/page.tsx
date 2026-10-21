import { TimelineView } from "@/components/timeline/timeline-view";
import { prisma } from "@/lib/db";
import { getTimelineRows } from "@/lib/data/timeline";

export const metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const [rows, members] = await Promise.all([
    getTimelineRows(),
    prisma.member.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return <TimelineView rows={rows} members={members} />;
}
