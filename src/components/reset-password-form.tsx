"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const INITIAL: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, INITIAL);

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

      <Field
        label="New Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <Field
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        pendingWhileSubmitting
        pendingLabel="Resetting…"
        className="uppercase tracking-[0.18em]"
      >
        Reset password
      </Button>
    </form>
  );
}