"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import Link from "next/link";

const INITIAL: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {state.error}
        </p>
      ) : null}

      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        /*
         * defaultValue, not value+useState. React resets a form once its
         * action completes, and the old wiring seeded a useState initialiser
         * from state.email — an initialiser only runs on mount, so the reset
         * emptied the field and nothing put the address back. Every rejected
         * login made you retype your email.
         *
         * loginAction has always echoed `email` back for exactly this; keying
         * off it lets the post-action reset restore the submitted address.
         * Same fix as F1 on the profile form.
         */
        defaultValue={state.email ?? ""}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        pendingWhileSubmitting
        pendingLabel="Signing in…"
        className="uppercase tracking-[0.18em]"
      >
        Sign in
      </Button>

      <p className="text-center text-sm text-[color:var(--muted)]">
        <Link href="/forgot-password" className="font-medium text-[color:var(--brand)] hover:underline">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
