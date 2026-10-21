"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Signing in
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[0.8125rem] font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[0.8125rem] font-medium">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-[0.7rem] bg-destructive/10 px-3 py-2 text-[0.8125rem] font-medium text-destructive ring-1 ring-destructive/15"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
