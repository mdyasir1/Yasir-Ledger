import { redirect } from "next/navigation";
import { BrandLockup, BrandMark } from "@/components/brand";
import { appConfig } from "@/config/app";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const rawNext = params.next;
  const nextPath =
    typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark size="lg" />
        <BrandLockup />
      </div>

      <LoginForm nextPath={nextPath} />

      <p className="text-xs text-muted-foreground">{appConfig.loginCredit}</p>
    </main>
  );
}
