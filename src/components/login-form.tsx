"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import Link from "next/link";

const INITIAL: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL);
  const [email, setEmail] = useState(state.email ?? "");

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
        value={email}
        onChange={(event) => setEmail(event.target.value)}
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
