"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/auth";

/** Sign the administrator out and return to the login screen. */
export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
