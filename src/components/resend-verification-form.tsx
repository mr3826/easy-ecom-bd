"use client";

import { useActionState, useState } from "react";
import { resendVerificationAction, type ResendVerificationState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const INITIAL: ResendVerificationState = {};

export function ResendVerificationForm() {
  const [state, formAction] = useActionState(resendVerificationAction, INITIAL);
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
      {state.success ? (
        <p
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {state.success}
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

      <Button
        type="submit"
        size="lg"
        fullWidth
        pendingWhileSubmitting
        pendingLabel="Sending…"
        className="uppercase tracking-[0.18em]"
      >
        Send verification link
      </Button>
    </form>
  );
}