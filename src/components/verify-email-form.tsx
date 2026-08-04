"use client";

import { useActionState } from "react";
import { verifyEmailAction, type VerifyEmailState } from "@/app/actions";
import { Button } from "@/components/ui/button";

const INITIAL: VerifyEmailState = {};

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(verifyEmailAction, INITIAL);

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

      <input type="hidden" name="token" value={token} />

      <Button
        type="submit"
        size="lg"
        fullWidth
        pendingWhileSubmitting
        pendingLabel="Verifying…"
        className="uppercase tracking-[0.18em]"
      >
        Verify email
      </Button>
    </form>
  );
}