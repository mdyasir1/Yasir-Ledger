import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth";

/**
 * The authenticated application area.
 *
 * The proxy already redirects unauthenticated requests, but the session is
 * re-checked here so that a page rendered directly (or a request that reached
 * the server by another route) can never render protected content.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <AppShell adminEmail={session.email}>{children}</AppShell>;
}
