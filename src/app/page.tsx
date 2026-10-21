import { redirect } from "next/navigation";

/** The root route forwards to the dashboard. */
export default function HomePage() {
  redirect("/dashboard");
}
