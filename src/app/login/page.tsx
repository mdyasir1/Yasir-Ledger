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
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-primary p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_10%,rgb(255_255_255/0.14),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 size-[26rem] rounded-full border border-white/8"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -bottom-10 size-[18rem] rounded-full border border-white/6"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-[0.6rem] bg-white/10 font-display text-base font-semibold text-white ring-1 ring-white/15">
            Y
          </div>
          <p className="font-display text-[0.95rem] font-semibold tracking-[-0.02em] text-white">
            {appConfig.name}
          </p>
        </div>

        <div className="relative max-w-md space-y-5">
          <h1 className="font-display text-[2.6rem] leading-[1.08] font-semibold tracking-[-0.04em] text-white">
            Every rupee of the cheeti, accounted for.
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-white/65">
            Track who has paid each month, what is still outstanding, and who
            is due a payout. Private, precise, and built for one administrator.
          </p>
        </div>

        <p className="relative text-[0.75rem] text-white/45">
          {appConfig.loginCredit}
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col items-center gap-4 text-center lg:hidden">
            <BrandMark size="default" />
            <BrandLockup />
          </div>

          <div className="hidden flex-col gap-2 lg:flex">
            <p className="eyebrow">Administrator access</p>
            <h2 className="font-display text-[1.6rem] leading-none font-semibold tracking-[-0.032em]">
              Sign in
            </h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Enter the administrator credentials to open your ledger.
            </p>
          </div>

          <LoginForm nextPath={nextPath} />

          <p className="text-center text-[0.6875rem] text-muted-foreground lg:hidden">
            {appConfig.loginCredit}
          </p>
        </div>
      </section>
    </main>
  );
}
