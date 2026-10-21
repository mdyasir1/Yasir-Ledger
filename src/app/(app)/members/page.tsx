import { MembersView } from "@/components/members/members-view";
import { getMemberRows } from "@/lib/data/members";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const members = await getMemberRows();

  return <MembersView members={members} />;
}
