"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const INITIAL: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL);
  // React resets uncontrolled fields once a form action settles, which would
  // wipe the address on every failed attempt. Controlling it keeps the value
  // on the client; the initial read of state.email covers the no-JS path,
  // where the only thing that survives is what the server echoes back.
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
    </form>
  );
}
